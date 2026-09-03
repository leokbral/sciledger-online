/**
 * SciLedger — Normalizador do corpo do artigo para os templates de PDF.
 *
 * O `paper.content` guardado no banco é o HTML cru que sai do mammoth / do serviço DTH:
 * `<h1>`, `<h2>`, `<p>`, `<table>`, `<img src="/api/images/...">` — sem nenhuma classe.
 * Os templates, por outro lado, estilizam classes específicas (`h2.sec`, `h3.sub`,
 * `p.lead`, `table.data`, `figure`). Sem esta camada o PDF sai com a tipografia
 * padrão do navegador — foi exatamente o que apareceu no primeiro teste.
 *
 * Esta função é a tradução entre os dois mundos. Ela NÃO reescreve o texto do autor:
 * só marca a estrutura para que o CSS do template consiga pintar.
 */

export type NormalizedArticle = {
	/** Corpo pronto para o token {{BODY}}. */
	body: string;
	/** Itens de referência já em HTML (sem <li>), extraídos da seção "References" do corpo. */
	references: string[];
	/** Quantas seções numeradas foram encontradas (diagnóstico). */
	sectionCount: number;
	/** Quantas figuras foram montadas (diagnóstico). */
	figureCount: number;
};

/** Seções que, por convenção editorial, não recebem número. */
const UNNUMBERED =
	/^(abstract|resumo|references?|refer[êe]ncias?|bibliography|acknowledg(e)?ments?|agradecimentos?|funding|financiamento|conflicts? of interest|competing interests|data availability|author contributions?|supplementary material|appendix|ap[êe]ndice|anexo|notes?)\b/i;

const REFERENCE_HEADING =
	/^\s*(references?|refer[êe]ncias?( bibliogr[áa]ficas)?|bibliography|works cited|literature cited)\s*$/i;

type Heading = { level: number; start: number; end: number; text: string; inner: string };

function stripTags(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Parágrafo que na prática é um título de seção: só texto em negrito, curto.
 * O Word gera isso o tempo todo — `<p><strong>REFERENCES</strong></p>` em vez de
 * um `<h1>`. Sem reconhecer esse formato, a seção de referências nunca é extraída
 * e as citações `[N]` do texto ficam sem lista para apontar.
 */
const PSEUDO_HEADING = /<p\b[^>]*>\s*(?:<(?:strong|b|em|u|span)\b[^>]*>\s*)+([^<]{2,80}?)\s*(?:<\/(?:strong|b|em|u|span)\s*>\s*)+<\/p\s*>/gi;

function findHeadings(html: string): Heading[] {
	const out: Heading[] = [];

	const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		out.push({
			level: Number(m[1]),
			start: m.index,
			end: m.index + m[0].length,
			inner: m[2],
			text: stripTags(m[2])
		});
	}

	// Só vale a pena tratar pseudo-títulos quando não há títulos de verdade,
	// ou quando o texto é justamente um dos rótulos de seção que reconhecemos.
	const levels = out.map((h) => h.level);
	const fallbackLevel = levels.length ? Math.min(...levels) : 1;
	PSEUDO_HEADING.lastIndex = 0;
	while ((m = PSEUDO_HEADING.exec(html))) {
		const text = stripTags(m[1]);
		if (!text) continue;
		const isSectionLabel = REFERENCE_HEADING.test(text) || UNNUMBERED.test(text);
		if (!isSectionLabel && levels.length) continue;
		if (out.some((h) => m!.index >= h.start && m!.index < h.end)) continue;
		out.push({
			level: fallbackLevel,
			start: m.index,
			end: m.index + m[0].length,
			inner: m[1],
			text
		});
	}

	return out.sort((a, b) => a.start - b.start);
}

/** Quebra o bloco de referências em itens individuais. */
function splitReferences(chunk: string): string[] {
	const items: string[] = [];

	const liRe = /<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi;
	let m: RegExpExecArray | null;
	while ((m = liRe.exec(chunk))) items.push(m[1].trim());
	if (items.length) return items.filter((item) => stripTags(item).length > 1);

	const pRe = /<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi;
	while ((m = pRe.exec(chunk))) items.push(m[1].trim());
	if (items.length) return items.filter((item) => stripTags(item).length > 1);

	return chunk
		.split(/<br\s*\/?>/i)
		.map((line) => line.trim())
		.filter((line) => stripTags(line).length > 1);
}

/**
 * Extrai a seção "References" do corpo.
 * Motivo: no template ela vive na coluna de back matter (`<ol class="refs">`),
 * não no fluxo do texto — deixá-la no corpo duplicaria a informação.
 */
function extractReferences(html: string): { body: string; references: string[] } {
	const headings = findHeadings(html);
	const index = headings.findIndex((h) => REFERENCE_HEADING.test(h.text));
	if (index === -1) return { body: html, references: [] };

	const heading = headings[index];
	// a seção vai até o próximo título de nível igual ou superior
	const next = headings.slice(index + 1).find((h) => h.level <= heading.level);
	const stop = next ? next.start : html.length;

	const chunk = html.slice(heading.end, stop);
	const references = splitReferences(chunk);
	if (!references.length) return { body: html, references: [] };

	return { body: html.slice(0, heading.start) + html.slice(stop), references };
}

/** Envolve imagens soltas em <figure>, promovendo a legenda seguinte a <figcaption>. */
function buildFigures(html: string): { html: string; count: number } {
	let count = 0;

	// <p> que contém apenas uma imagem
	let out = html.replace(
		/<p\b[^>]*>\s*(?:<(?:strong|em|span|a)\b[^>]*>\s*)*(<img\b[^>]*>)\s*(?:<\/(?:strong|em|span|a)\s*>\s*)*<\/p\s*>/gi,
		(_all, img: string) => {
			count += 1;
			return `<figure>${img}</figure>`;
		}
	);

	// legenda logo após a figura ("Figure 1. ...", "Fig. 2 —", "Figura 3:")
	out = out.replace(
		/(<\/figure\s*>)\s*<p\b[^>]*>\s*((?:<[^>]+>\s*)*(?:figure|fig\.?|figura)\s*\d+[\s\S]*?)<\/p\s*>/gi,
		(_all, close: string, caption: string) =>
			close.replace(/<\/figure\s*>/i, `<figcaption>${caption.trim()}</figcaption></figure>`)
	);

	return { html: out, count };
}

/** Legendas de tabela ("Table 1. ...") logo antes da tabela viram <caption>. */
function buildTableCaptions(html: string): string {
	return html.replace(
		/<p\b[^>]*>\s*((?:<[^>]+>\s*)*(?:table|tabela|quadro)\s*\d+[\s\S]*?)<\/p\s*>\s*(<table\b[^>]*>)/gi,
		(_all, caption: string, open: string) => `${open}<caption>${caption.trim()}</caption>`
	);
}

export function normalizeArticleHtml(
	rawHtml: string,
	options: { title?: string; dropCap?: boolean } = {}
): NormalizedArticle {
	const { title = '', dropCap = true } = options;
	const source = typeof rawHtml === 'string' ? rawHtml : '';
	if (!source.trim()) return { body: '', references: [], sectionCount: 0, figureCount: 0 };

	// 1. tira a seção de referências (ela vai para o back matter do template)
	const extracted = extractReferences(source);
	let html = extracted.body;

	// 2. descobre qual nível de título faz papel de "seção"
	const headings = findHeadings(html);
	const sectionLevel = headings.length ? Math.min(...headings.map((h) => h.level)) : 1;

	// 3. reescreve os títulos de trás para frente (índices não se deslocam)
	const normalizedTitle = stripTags(title).toLowerCase();
	let sectionCount = 0;
	const numbers = new Map<number, string>();
	for (const heading of headings) {
		if (heading.level !== sectionLevel) continue;
		if (UNNUMBERED.test(heading.text)) continue;
		if (normalizedTitle && heading.text.toLowerCase() === normalizedTitle) continue;
		sectionCount += 1;
		numbers.set(heading.start, String(sectionCount).padStart(2, '0'));
	}

	for (const heading of [...headings].reverse()) {
		let replacement: string;
		if (heading.level === sectionLevel) {
			// um <h1> que só repete o título do artigo é ruído no PDF
			if (normalizedTitle && heading.text.toLowerCase() === normalizedTitle) {
				replacement = '';
			} else {
				const n = numbers.get(heading.start);
				const marker = n ? `<span class="n">${n}</span>` : '';
				replacement = `<h2 class="sec">${marker}<span>${heading.inner.trim()}</span></h2>`;
			}
		} else {
			replacement = `<h3 class="sub">${heading.inner.trim()}</h3>`;
		}
		html = html.slice(0, heading.start) + replacement + html.slice(heading.end);
	}

	// 4. tabelas e figuras
	html = buildTableCaptions(html);
	html = html.replace(/<table\b([^>]*)>/gi, (all, attrs: string) => {
		if (/class\s*=/i.test(attrs)) {
			return all.replace(/class\s*=\s*("|')(.*?)\1/i, (_m, q: string, v: string) => `class=${q}${v} data${q}`);
		}
		return `<table${attrs} class="data">`;
	});
	const figures = buildFigures(html);
	html = figures.html;

	// 5. capitular na primeira frase real do artigo
	if (dropCap) {
		let applied = false;
		html = html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p\s*>/i, (all, attrs: string, inner: string) => {
			if (applied || stripTags(inner).length < 40) return all;
			applied = true;
			if (/class\s*=/i.test(attrs)) {
				return `<p${attrs.replace(/class\s*=\s*("|')(.*?)\1/i, (_m, q: string, v: string) => `class=${q}${v} lead${q}`)}>${inner}</p>`;
			}
			return `<p${attrs} class="lead">${inner}</p>`;
		});
	}

	// 6. imagens nunca podem estourar a caixa de texto
	html = html.replace(/<img\b([^>]*)>/gi, (all, attrs: string) => {
		let next = attrs
			.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
			.replace(/\s*\/\s*$/, '');
		if (!/style\s*=/i.test(next)) next += ' style="max-width:100%;height:auto"';
		return `<img${next}>`;
	});

	return {
		body: html.trim(),
		references: extracted.references,
		sectionCount,
		figureCount: figures.count
	};
}
