/**
 * SciLedger — Paper (MongoDB) ➜ ViewModel do PDF
 *
 * Camada ÚNICA de tradução entre o banco e QUALQUER template.
 * Os templates não conhecem o schema; conhecem só os tokens.
 * Mudou o schema? Você mexe só aqui — os 4 templates continuam funcionando.
 *
 * Esta camada é PURA: não toca no Mongo. Quem busca usuários, imagens e citações
 * é `resolveArticleData.ts`, que entrega tudo pronto aqui em `BuildOptions`.
 */
import { createHash } from 'node:crypto';
import { autolinkHtml } from './autolink';
import { parseReferenceNumber } from './crossReference';
import {
	buildPaperAffiliationIndex,
	formatAffiliationDisplayName,
	type PaperAuthorSnapshot
} from '$lib/utils/paperAuthorAffiliations';

export type ArticleTokens = Record<string, string>;

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

const fmtDate = (d?: Date | string | null) => {
	if (!d) return '—';
	const date = new Date(d as string);
	return Number.isNaN(date.getTime())
		? '—'
		: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * O resumo vem do editor rico com `<p>` dentro. O template já o coloca dentro de um
 * `<p>`, e `<p>` dentro de `<p>` é HTML inválido — o navegador fecha o primeiro e a
 * formatação quebra. Aqui os blocos viram quebras de linha e as ênfases sobrevivem.
 */
const toInlineHtml = (v: unknown) =>
	String(v ?? '')
		.replace(/<\/(p|div|h[1-6])\s*>\s*<(p|div|h[1-6])\b[^>]*>/gi, '<br><br>')
		.replace(/<\/?(p|div|h[1-6])\b[^>]*>/gi, '')
		.replace(/^(?:\s|<br\s*\/?>)+|(?:\s|<br\s*\/?>)+$/gi, '')
		.trim();

const stripTags = (v: unknown) =>
	String(v ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();

/** Primeira / última transição do statusHistory para um dado status. */
function firstTransitionTo(paper: any, status: string): Date | null {
	const h = (paper?.statusHistory ?? []).filter((e: any) => e?.newStatus === status);
	return h.length ? new Date(h[0].createdAt) : null;
}
function lastTransitionTo(paper: any, status: string): Date | null {
	const h = (paper?.statusHistory ?? []).filter((e: any) => e?.newStatus === status);
	return h.length ? new Date(h[h.length - 1].createdAt) : null;
}

/**
 * Assinatura (digest) do registro editorial.
 *
 * Princípio: um resumo criptográfico do QUE foi publicado + de COMO se chegou lá.
 * Entram identidade do artigo, autores, DOI e a sequência completa de transições de
 * estado. Qualquer alteração em qualquer um desses campos muda o digest por inteiro —
 * é isso que torna o histórico "à prova de adulteração" (tamper-evident): o PDF
 * impresso carrega o mesmo número que o servidor recalcula na página de verificação.
 */
export function computeEditorialDigest(paper: any): string {
	const canonical = JSON.stringify({
		id: paper?.id ?? paper?._id ?? '',
		title: stripTags(paper?.title),
		doi: paper?.doi ?? '',
		authors: (paper?.authorAffiliations ?? []).map((a: any) => a?.name ?? ''),
		events: (paper?.statusHistory ?? []).map((e: any) => [
			e?.action ?? '',
			e?.previousStatus ?? '',
			e?.newStatus ?? '',
			e?.userId ?? '',
			e?.createdAt ? new Date(e.createdAt).toISOString() : ''
		])
	});
	return createHash('sha256').update(canonical).digest('hex');
}

/** Autores + afiliações com numeração superscrita, a partir dos snapshots já resolvidos. */
function buildAuthorsHtml(authors: PaperAuthorSnapshot[]) {
	if (!authors.length) {
		return { authorsHtml: '—', affilHtml: '', correspondingEmail: '' };
	}

	const index = buildPaperAffiliationIndex(authors);

	const authorsHtml = authors
		.map((author, i) => {
			const marks = (index.authorAffiliationIndexes[i] ?? []).map(String);
			if (author.isCorresponding) marks.push('*');
			const sup = marks.length ? `<sup>${marks.join(',')}</sup>` : '';
			return `${esc(author.name)}${sup}`;
		})
		.join(' &nbsp;·&nbsp; ');

	const corresponding = authors.find((a) => a.isCorresponding);
	const affilHtml = [
		...index.entries.map(
			(entry) =>
				`<sup>${entry.index}</sup> ${esc(entry.displayName || formatAffiliationDisplayName(entry.affiliation))}`
		),
		corresponding?.email
			? `<sup>*</sup> Corresponding author: <a href="mailto:${esc(corresponding.email)}">${esc(corresponding.email)}</a>`
			: ''
	]
		.filter(Boolean)
		.join(' &nbsp;·&nbsp; ');

	return { authorsHtml, affilHtml, correspondingEmail: corresponding?.email ?? '' };
}

/** CRediT (creditAuthorStatements) ➜ parágrafo "Author contributions". */
export function buildContributions(paper: any): string {
	const statements = paper?.creditAuthorStatements ?? [];
	if (!statements.length) return 'Not declared for this article.';
	return statements
		.map((s: any) => {
			const roles = (s?.roles ?? []).map((r: any) => esc(r)).join(', ');
			const extra = s?.statement ? ` ${esc(s.statement)}` : '';
			return `<b>${esc(s?.authorName ?? '')}</b>: ${roles || '—'}.${extra}`;
		})
		.join(' ');
}

/** supplementaryMaterials + supplementaryFiles ➜ "Data availability". */
export function buildDataAvailability(paper: any): string {
	const links = (paper?.supplementaryMaterials ?? []).map(
		(x: any) => `${esc(x?.title ?? 'Repository')}: <a href="${esc(x?.url ?? '')}">${esc(x?.url ?? '')}</a>`
	);
	const files = (paper?.supplementaryFiles ?? []).map(
		(x: any) => `${esc(x?.title ?? x?.filename ?? 'File')} (supplementary file)`
	);
	const all = [...links, ...files];
	return all.length ? all.join(' · ') : 'No additional data associated with this article.';
}

export type BuildOptions = {
	/** Autores já resolvidos (snapshot do paper + perfis do banco). */
	authors?: PaperAuthorSnapshot[];
	/** Corpo já normalizado para as classes do template. */
	body?: string;
	/** Referências já resolvidas, em HTML, sem <li>. */
	references?: string[];
	/**
	 * Quantas das primeiras entradas vieram da seção "References" do próprio artigo.
	 * Só essas podem receber `id="ref-N"`: a numeração delas é a que o autor citou.
	 * As demais vêm de `paper.citations` e não têm número no texto.
	 */
	anchoredReferences?: number;
	/** data: URI do QR de verificação. */
	verifyQrDataUri?: string;
	/** Digest do registro editorial; se ausente é calculado a partir do paper. */
	verifyDigest?: string;
	/** Nome do Hub/journal, quando o artigo pertence a um. */
	hubName?: string;
	/** Origem pública da plataforma (sem barra final). */
	baseUrl?: string;
};

/**
 * Lista de referências com âncoras.
 *
 * Cada entrada recebe `id="ref-N"` — o alvo dos `[N]` do texto. Quando a própria
 * referência já traz o número ("[3] Smith, J. …"), ele é extraído e reaplicado com
 * `value`, para o número impresso pelo `<ol>` bater com o que o autor citou.
 *
 * As setinhas ↩ NÃO são montadas aqui: quem as coloca é `enhanceReferencesInPage`,
 * já dentro do navegador, porque só lá se sabe quais referências foram de fato
 * citadas e onde.
 */
function buildReferenceList(references: string[], anchored: number): string {
	return references
		.map((raw, index) => {
			const parsed = parseReferenceNumber(raw);
			const number = parsed.number ?? index + 1;
			const value = parsed.number ? ` value="${parsed.number}"` : '';
			// Sem âncora, `enhanceReferencesInPage` vai procurar a entrada certa no
			// corpo do artigo em vez de confiar nesta posição.
			const id = index < anchored ? ` id="ref-${number}"` : '';
			return `<li${id}${value}>${autolinkHtml(parsed.html)}</li>`;
		})
		.join('\n');
}

export function buildArticleTokens(paper: any, opts: BuildOptions = {}): ArticleTokens {
	const base = (opts.baseUrl ?? 'https://sciledger.org').replace(/\/+$/, '');
	const authors = opts.authors ?? [];
	const { authorsHtml, affilHtml } = buildAuthorsHtml(authors);

	const received = firstTransitionTo(paper, 'reviewer assignment') ?? paper?.createdAt ?? null;
	const accepted = lastTransitionTo(paper, 'accepted') ?? lastTransitionTo(paper, 'published');
	const published = lastTransitionTo(paper, 'published') ?? paper?.updatedAt ?? null;
	const revised = paper?.phaseTimestamps?.correctionEnd ?? null;

	const rounds = paper?.reviewRound ?? (paper?.phaseTimestamps?.round2Start ? 2 : 1);
	const reports = paper?.peer_review?.reviewCount ?? (paper?.peer_review?.reviews?.length ?? 0);
	const events = (paper?.statusHistory ?? []).length;

	const year = published ? new Date(published).getFullYear() : new Date().getFullYear();
	const kicker =
		(paper?.scopusClassifications ?? [])
			.map((c: any) => c?.area)
			.filter(Boolean)
			.slice(0, 2)
			.join(' · ') ||
		opts.hubName ||
		'Research';

	const paperId = String(paper?.id ?? paper?._id ?? '');
	const digest = opts.verifyDigest ?? computeEditorialDigest(paper);
	const shortDigest = digest.slice(0, 16);

	const authorList = authors.length
		? authors.map((a) => esc(a.name)).join(', ')
		: esc(stripTags(paper?.mainAuthor?.name ?? ''));

	const citation =
		`${authorList} (${year}). ${esc(stripTags(paper?.title))}. <i>SciLedger</i>.` +
		(paper?.doi ? ` https://doi.org/${esc(paper.doi)}` : ` ${esc(base)}/verify/${esc(paperId)}`);

	const references = opts.references ?? [];
	const referencesHtml = references.length
		? buildReferenceList(references, opts.anchoredReferences ?? references.length)
		: '<li style="list-style:none;margin-left:-5mm">No references recorded for this article.</li>';

	const reviewModel = paper?.peer_review?.reviewType === 'open' ? 'Open' : 'Double-anonymised';
	const verifyUrl = `${base.replace(/^https?:\/\//, '')}/verify/${esc(paperId)}`;
	const verifyHref = `${base}/verify/${esc(paperId)}`;
	const doiText = paper?.doi ? `https://doi.org/${esc(paper.doi)}` : verifyHref;

	/**
	 * A v3 reserva uma coluna lateral — é o que dá a ela a medida de leitura de ~66
	 * caracteres (estilo Tufte). Sem notas do autor essa coluna sairia vazia em todas
	 * as páginas, o que parece defeito. Estas duas fichas a abrem com dado verdadeiro.
	 */
	const sidenotes =
		`<aside class="sn"><b>Cite this article</b><br>${citation}</aside>` +
		`<aside class="sn"><b>Peer review</b><br>${esc(reviewModel)} · ${rounds} round(s) · ` +
		`${reports} referee report(s). Editorial record at ${esc(verifyUrl)}.</aside>`;

	return {
		TITLE: esc(stripTags(paper?.title)),
		SUBTITLE: esc(stripTags(paper?.subtitle ?? '')),
		KICKER: esc(kicker),
		ARTICLE_TYPE: opts.hubName ? 'Journal Article' : 'Research Article',
		AUTHORS: authorsHtml,
		AFFILIATIONS: affilHtml,
		ABSTRACT: autolinkHtml(toInlineHtml(paper?.abstract)),
		KEYWORDS: (paper?.keywords ?? []).map((k: any) => esc(k)).join(' · '),

		// DOI: texto puro (vai também para o rodapé, onde âncora não funciona)
		DOI: doiText,
		// DOI_LINK: a versão clicável, para o corpo do documento
		DOI_LINK: `<a href="${doiText}">${doiText}</a>`,
		ARTICLE_ID: esc(paperId),
		VOLUME: esc(paper?.volume ?? `${year}`),
		PAGES: esc(paper?.pages ?? 'Open Access'),

		DATE_RECEIVED: fmtDate(received),
		DATE_REVISED: fmtDate(revised),
		DATE_ACCEPTED: fmtDate(accepted),
		DATE_PUBLISHED: fmtDate(published),
		REVIEW_MODEL: reviewModel,
		REVIEW_ROUNDS: String(rounds),
		REVIEW_REPORTS: String(reports),
		LICENSE: 'CC BY 4.0',
		YEAR: String(year),

		BODY: autolinkHtml(opts.body ?? paper?.content ?? ''),
		SIDENOTES: autolinkHtml(sidenotes),
		REFERENCES: referencesHtml,
		CITATION: autolinkHtml(citation),

		CONTRIBUTIONS: autolinkHtml(buildContributions(paper)),
		FUNDING: 'No external funding was declared for this article.',
		DATA_AVAILABILITY: autolinkHtml(buildDataAvailability(paper)),
		CONFLICTS: 'The authors declare no conflict of interest.',

		VERIFY_URL: verifyUrl,
		VERIFY_LINK: `<a href="${verifyHref}">${verifyUrl}</a>`,
		VERIFY_QR: opts.verifyQrDataUri ?? '',
		VERIFY_DIGEST: esc(shortDigest),
		VERIFY_EVENTS: String(events)
	};
}
