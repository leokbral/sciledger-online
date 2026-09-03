/**
 * SciLedger — Embutir as imagens do artigo no HTML do PDF.
 *
 * Por que isso é necessário: o PDF é gerado com `page.setContent(html)`. Nesse modo
 * a página do Chromium nasce em `about:blank`, sem URL base — então `src="/api/images/x"`
 * não resolve para lugar nenhum e a figura simplesmente não aparece. Foi o que
 * aconteceu no primeiro teste.
 *
 * A solução robusta não é apontar para `http://localhost:5173/api/images/x`
 * (dependeria do servidor estar de pé, da porta certa e de sessão), e sim ler o
 * binário direto do GridFS e transformá-lo em `data:` URI. O HTML fica
 * autossuficiente: nenhuma requisição de rede durante a renderização.
 */
import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';

const bucket = new GridFSBucket(db);

/** Acima disso a imagem vira um espaço reservado — um data: URI gigante trava o Chromium. */
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

const IMAGE_ID = /\/api\/images\/([^"'\s?#]+)/i;

async function readImage(id: string): Promise<{ data: Buffer; contentType: string } | null> {
	const files = await bucket.find({ 'metadata.id': id }).limit(1).toArray();
	if (!files.length) return null;

	const file = files[0];
	if (typeof file.length === 'number' && file.length > MAX_INLINE_BYTES) return null;

	const chunks: Uint8Array[] = [];
	for await (const chunk of bucket.openDownloadStream(file._id)) chunks.push(chunk as Uint8Array);

	return {
		data: Buffer.concat(chunks),
		contentType: (file as { contentType?: string }).contentType || 'image/png'
	};
}

/**
 * Troca todo `src` que aponte para `/api/images/<id>` por um `data:` URI.
 * Ids repetidos são lidos uma única vez.
 */
export async function inlineArticleImages(html: string): Promise<{ html: string; inlined: number; missing: string[] }> {
	if (!html || !html.includes('/api/images/')) return { html: html ?? '', inlined: 0, missing: [] };

	const ids = new Set<string>();
	const srcRe = /src\s*=\s*("([^"]*)"|'([^']*)')/gi;
	let m: RegExpExecArray | null;
	while ((m = srcRe.exec(html))) {
		const value = m[2] ?? m[3] ?? '';
		const found = value.match(IMAGE_ID);
		if (found) ids.add(decodeURIComponent(found[1]));
	}
	if (!ids.size) return { html, inlined: 0, missing: [] };

	const cache = new Map<string, string>();
	const missing: string[] = [];

	await Promise.all(
		[...ids].map(async (id) => {
			try {
				const image = await readImage(id);
				if (!image) {
					missing.push(id);
					return;
				}
				cache.set(id, `data:${image.contentType};base64,${image.data.toString('base64')}`);
			} catch (error) {
				console.error('[pdf] failed to inline image', id, error);
				missing.push(id);
			}
		})
	);

	let inlined = 0;
	const out = html.replace(srcRe, (all, _q, dq?: string, sq?: string) => {
		const value = dq ?? sq ?? '';
		const found = value.match(IMAGE_ID);
		if (!found) return all;
		const replacement = cache.get(decodeURIComponent(found[1]));
		if (!replacement) return all;
		inlined += 1;
		return `src="${replacement}"`;
	});

	return { html: out, inlined, missing };
}
