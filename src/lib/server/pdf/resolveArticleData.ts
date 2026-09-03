/**
 * SciLedger — Resolução dos dados do artigo para o PDF.
 *
 * O documento do Mongo sozinho não basta:
 *  · `mainAuthor` / `coAuthors` são UUIDs, não nomes;
 *  · `authorAffiliations` é um snapshot que pode estar incompleto (papers antigos);
 *  · `citations` é uma lista de UUIDs, não de referências formatadas;
 *  · `content` traz `<img src="/api/images/…">`, que não resolve dentro do Chromium;
 *  · `hubId` é um UUID.
 *
 * Este módulo faz todas essas viagens ao banco UMA vez e devolve os tokens prontos.
 */
import { GridFSBucket } from 'mongodb';
import { db } from '$lib/db/mongo';
import {
	authorSnapshotMatchesReference,
	normalizeAuthorSnapshot,
	normalizeAuthorSnapshots,
	type PaperAuthorSnapshot
} from '$lib/utils/paperAuthorAffiliations';
import { buildArticleTokens, computeEditorialDigest, type ArticleTokens } from './articleViewModel';
import { normalizeArticleHtml } from './normalizeArticleHtml';
import { inlineArticleImages } from './inlineArticleImages';
import { qrSvgDataUri } from './qr';

/** Os _id desta base são UUID em string, não ObjectId — os tipos do driver precisam saber. */
type MongoRecord = Record<string, any> & { _id: string; id?: string };

const users = db.collection<MongoRecord>('users');
const hubs = db.collection<MongoRecord>('hubs');
const papers = db.collection<MongoRecord>('papers');

export type ResolveDiagnostics = {
	authors: number;
	affiliations: number;
	sections: number;
	figures: number;
	imagesInlined: number;
	imagesMissing: string[];
	references: number;
	referencesSource: 'body' | 'citations' | 'both' | 'none';
	/** Preenchidos depois da renderização, por enhanceReferencesInPage. */
	citationLinks?: number;
	referencesAnchored?: number;
	citationsWithoutEntry?: number[];
};

function referenceId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return String(record.id ?? record._id ?? '').trim();
	}
	return '';
}

async function findUser(reference: unknown): Promise<Record<string, unknown> | null> {
	// já veio populado pelo Mongoose? aproveita
	if (reference && typeof reference === 'object') {
		const record = reference as Record<string, unknown>;
		if (record.firstName || record.lastName || record.username) return record;
	}

	const id = referenceId(reference);
	if (!id) return null;

	return (await users.findOne(
		{ $or: [{ id }, { _id: id }] },
		{
			projection: {
				id: 1,
				_id: 1,
				firstName: 1,
				lastName: 1,
				username: 1,
				email: 1,
				orcid: 1,
				position: 1,
				institution: 1,
				department: 1,
				affiliation: 1,
				affiliations: 1
			}
		}
	)) as unknown as Record<string, unknown> | null;
}

/**
 * Autores na ordem editorial, com afiliação.
 *
 * Regra: o snapshot `authorAffiliations` é a FONTE DE VERDADE (foi congelado na
 * submissão e é o que a revista publicou). O perfil do usuário só entra para
 * preencher buracos — nome, e-mail, ORCID, afiliação — em papers antigos, gravados
 * antes do snapshot existir. É por isso que artigos legados apareciam sem autor.
 */
async function resolveAuthors(paper: any): Promise<PaperAuthorSnapshot[]> {
	const snapshots = normalizeAuthorSnapshots(paper?.authorAffiliations);

	const references = [
		paper?.mainAuthor,
		...(Array.isArray(paper?.coAuthors) ? paper.coAuthors : []),
		...(Array.isArray(paper?.authors) ? paper.authors : []),
		paper?.correspondingAuthor
	].filter(Boolean);

	const seen = new Set<string>();
	const ordered: PaperAuthorSnapshot[] = [];

	for (const reference of references) {
		const key = referenceId(reference);
		if (key && seen.has(key)) continue;
		if (key) seen.add(key);

		const snapshot = snapshots.find((s) => authorSnapshotMatchesReference(s, reference)) ?? null;
		const profile = normalizeAuthorSnapshot(await findUser(reference));
		if (!snapshot && !profile) continue;

		ordered.push({
			...(profile ?? {}),
			...(snapshot ?? {}),
			name: snapshot?.name || profile?.name || 'Unknown author',
			email: snapshot?.email || profile?.email || '',
			orcid: snapshot?.orcid || profile?.orcid || '',
			affiliations: snapshot?.affiliations?.length
				? snapshot.affiliations
				: (profile?.affiliations ?? []),
			isCorresponding:
				Boolean(snapshot?.isCorresponding) ||
				authorSnapshotMatchesReference(snapshot ?? profile, paper?.correspondingAuthor)
		} as PaperAuthorSnapshot);
	}

	// snapshots de coautores externos (sem conta na plataforma) entram no fim
	for (const snapshot of snapshots) {
		const already = ordered.some(
			(a) =>
				(a.userId && a.userId === snapshot.userId) ||
				(a.name && snapshot.name && a.name.toLowerCase() === snapshot.name.toLowerCase())
		);
		if (!already) ordered.push(snapshot);
	}

	return ordered.length ? ordered : snapshots;
}

async function resolveHubName(reference: unknown): Promise<string> {
	if (reference && typeof reference === 'object') {
		const record = reference as Record<string, unknown>;
		const title = String(record.title ?? record.name ?? '').trim();
		if (title) return title;
	}
	const id = referenceId(reference);
	if (!id) return '';
	const hub = await hubs.findOne({ $or: [{ id }, { _id: id }] }, { projection: { title: 1, name: 1 } });
	return String(hub?.title ?? hub?.name ?? '').trim();
}

/** `paper.citations` é uma lista de UUIDs de outros papers da plataforma. */
async function resolveCitations(citations: unknown): Promise<string[]> {
	const ids = (Array.isArray(citations) ? citations : []).map(referenceId).filter(Boolean);
	if (!ids.length) return [];

	const cited = await papers
		.find(
			{ $or: [{ id: { $in: ids } }, { _id: { $in: ids } }] },
			{ projection: { id: 1, _id: 1, title: 1, doi: 1, createdAt: 1, authorAffiliations: 1 } }
		)
		.toArray();

	const byId = new Map<string, any>(cited.map((doc: any) => [String(doc.id ?? doc._id), doc] as [string, any]));

	return ids
		.map((id) => byId.get(id))
		.filter(Boolean)
		.map((doc: any) => {
			const names = (doc.authorAffiliations ?? [])
				.map((a: any) => a?.name)
				.filter(Boolean)
				.join(', ');
			const year = doc.createdAt ? new Date(doc.createdAt).getFullYear() : '';
			const title = String(doc.title ?? '').replace(/<[^>]*>/g, '');
			const doi = doc.doi ? ` https://doi.org/${doc.doi}` : '';
			return `${names || 'Unknown author'}${year ? ` (${year})` : ''}. <i>${title}</i>. SciLedger.${doi}`;
		});
}

/** Só existe uma imagem de capa quando `paperPictures` traz algo. */
async function coverImageDataUri(paper: any): Promise<string> {
	const id = (Array.isArray(paper?.paperPictures) ? paper.paperPictures : []).filter(Boolean)[0];
	if (!id) return '';
	try {
		const bucket = new GridFSBucket(db);
		const files = await bucket.find({ 'metadata.id': String(id) }).limit(1).toArray();
		if (!files.length) return '';
		const chunks: Uint8Array[] = [];
		for await (const chunk of bucket.openDownloadStream(files[0]._id)) chunks.push(chunk as Uint8Array);
		return `data:${(files[0] as { contentType?: string }).contentType || 'image/png'};base64,${Buffer.concat(chunks).toString('base64')}`;
	} catch {
		return '';
	}
}

/**
 * Ponto de entrada: paper do Mongo ➜ tokens prontos para qualquer template.
 * `baseUrl` deve ser a origem pública (ex.: `https://sciledger.org`) para o QR apontar certo.
 */
export async function resolveArticleTokens(
	paper: any,
	baseUrl: string
): Promise<{ tokens: ArticleTokens; diagnostics: ResolveDiagnostics }> {
	const [authors, hubName] = await Promise.all([resolveAuthors(paper), resolveHubName(paper?.hubId)]);

	// corpo: primeiro a estrutura (classes do template), depois as imagens.
	// As citações [N] são resolvidas depois, dentro do Chromium — ver
	// enhanceReferencesInPage.ts.
	const normalized = normalizeArticleHtml(String(paper?.content ?? ''), { title: String(paper?.title ?? '') });
	const inlined = await inlineArticleImages(normalized.body);

	const fromCitations = await resolveCitations(paper?.citations);
	const references = [...normalized.references, ...fromCitations];

	const digest = computeEditorialDigest(paper);
	const paperId = String(paper?.id ?? paper?._id ?? '');
	const verifyUrl = `${baseUrl.replace(/\/+$/, '')}/verify/${paperId}`;

	const tokens = buildArticleTokens(paper, {
		authors,
		hubName,
		baseUrl,
		body: inlined.html,
		references,
		anchoredReferences: normalized.references.length,
		verifyDigest: digest,
		verifyQrDataUri: qrSvgDataUri(verifyUrl, { ecc: 'M', quiet: 1 })
	});

	const cover = await coverImageDataUri(paper);
	tokens.COVER_IMAGE = cover;

	const affiliationCount = new Set(
		authors.flatMap((a) => (a.affiliations ?? []).map((x) => x.displayName || x.organization || ''))
	);
	affiliationCount.delete('');

	return {
		tokens,
		diagnostics: {
			authors: authors.length,
			affiliations: affiliationCount.size,
			sections: normalized.sectionCount,
			figures: normalized.figureCount,
			imagesInlined: inlined.inlined,
			imagesMissing: inlined.missing,
			references: references.length,
			referencesSource:
				normalized.references.length && fromCitations.length
					? 'both'
					: normalized.references.length
						? 'body'
						: fromCitations.length
							? 'citations'
							: 'none'
		}
	};
}
