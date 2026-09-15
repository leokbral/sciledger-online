/**
 * SciLedger — Renderizador de PDF do artigo publicado.
 *
 * Fluxo:
 *   Paper (Mongo)
 *     └─▶ resolveArticleTokens()   busca autores, imagens, citações; normaliza o corpo
 *           └─▶ fill(template)      troca {{TOKEN}} pelo valor
 *                 └─▶ Playwright    imprime em A4
 *
 * Os templates são importados com `?raw`: o Vite lê o arquivo em tempo de BUILD e
 * embute o conteúdo como string no JS compilado. Assim eles existem em produção —
 * ler de `src/` em runtime não funcionaria, porque o build não copia arquivos soltos.
 *
 * IMPORTANTE: cada variante tem margens próprias.
 * v2/v3 usam faixas full-bleed, então as margens LATERAIS precisam ser 0
 * (a classe .bleed compensa internamente com margin/padding de 18–20mm).
 */
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';
import { buildArticleTokens, type ArticleTokens, type BuildOptions } from './articleViewModel';
import { resolveArticleTokens, type ResolveDiagnostics } from './resolveArticleData';
import { fixPdfDestinations, toPoints } from './fixPdfDestinations';
import { enhanceReferencesInPage, type ReferenceLinkReport } from './enhanceReferencesInPage';

import logoSvg from '../../../../brand/logo/sciledger-logo.svg?raw';
import logoDarkSvg from '../../../../brand/logo/sciledger-logo-dark.svg?raw';
import wordmarkSvg from '../../../../brand/logo/sciledger-wordmark.svg?raw';
import tplV1 from './article-template.tpl.html?raw';
import tplV2One from './article-template-v2-1col.tpl.html?raw';
import tplV2Two from './article-template-v2-2col.tpl.html?raw';
import tplV3One from './article-template-v3-1col.tpl.html?raw';

export type TemplateVariant = 'v1' | 'v2-1col' | 'v2-2col' | 'v3-1col';

export const TEMPLATE_VARIANTS: TemplateVariant[] = ['v1', 'v2-1col', 'v2-2col', 'v3-1col'];

type Margin = { top: string; bottom: string; left: string; right: string };
type VariantCfg = { template: string; margin: Margin };

const VARIANTS: Record<TemplateVariant, VariantCfg> = {
	// clássico: margens laterais normais
	v1: { template: tplV1, margin: { top: '20mm', bottom: '18mm', left: '17mm', right: '17mm' } },
	// modernos: laterais 0 por causa do full-bleed
	'v2-1col': { template: tplV2One, margin: { top: '12mm', bottom: '14.5mm', left: '0mm', right: '0mm' } },
	'v2-2col': { template: tplV2Two, margin: { top: '12mm', bottom: '14.5mm', left: '0mm', right: '0mm' } },
	'v3-1col': { template: tplV3One, margin: { top: '12mm', bottom: '14.5mm', left: '0mm', right: '0mm' } }
};

function svgDataUri(svg: string) {
	return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

const BRAND_TOKENS: Record<string, string> = {
	SCILEDGER_LOGO: svgDataUri(logoSvg),
	SCILEDGER_LOGO_DARK: svgDataUri(logoDarkSvg),
	SCILEDGER_WORDMARK: svgDataUri(wordmarkSvg)
};

export function isTemplateVariant(value: unknown): value is TemplateVariant {
	return typeof value === 'string' && (TEMPLATE_VARIANTS as string[]).includes(value);
}

/** Substitui {{TOKEN}} — tokens ausentes viram string vazia (nunca deixa "{{X}}" vazando). */
export function fillTemplate(tpl: string, tokens: ArticleTokens): string {
	return tpl.replace(/\{\{([A-Z_]+)\}\}/g, (_m, k: string) => tokens[k] ?? BRAND_TOKENS[k] ?? '');
}

/** HTML final de uma variante, já preenchido. Útil para depurar sem gerar PDF. */
export function renderTemplateHtml(tokens: ArticleTokens, variant: TemplateVariant = 'v3-1col'): string {
	return fillTemplate(VARIANTS[variant].template, tokens);
}

/** Cabeçalho/rodapé correm por conta do Chromium — é a ÚNICA forma de ter número de página. */
function furniture(tokens: ArticleTokens, pad: string) {
	const header = '<span style="display:none"></span>';
	const footer = `
<div style="width:100%;font-family:Inter,Helvetica,Arial,sans-serif;font-size:6.5pt;color:#7C8AA8;padding:0 ${pad};">
  <div style="border-top:.5pt solid #E4E8F0;padding-top:2.4mm;display:flex;justify-content:space-between;align-items:center;">
    <span><i>${tokens.RUNNING_TITLE ?? ''}</i> &nbsp;&middot;&nbsp; ${tokens.DOI ?? ''} &nbsp;&middot;&nbsp; ${tokens.LICENSE ?? ''}</span>
    <span style="display:inline-flex;align-items:center;gap:4pt;"><img src="${BRAND_TOKENS.SCILEDGER_LOGO}" alt="SciLedger" style="height:10pt;width:auto;vertical-align:middle;"> &nbsp;&middot;&nbsp;
      <span class="pageNumber"></span>&thinsp;/&thinsp;<span class="totalPages"></span></span>
  </div>
</div>`;
	return { header, footer };
}

/** Renderiza a partir de tokens já prontos. */
export async function renderTokensToPdf(
	tokens: ArticleTokens,
	variant: TemplateVariant = 'v3-1col'
): Promise<{ pdf: Buffer; links: ReferenceLinkReport }> {
	const cfg = VARIANTS[variant];
	const html = fillTemplate(cfg.template, tokens);
	const pad = cfg.margin.left === '0mm' ? '20mm' : cfg.margin.left;
	const { header, footer } = furniture(tokens, pad);

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
		// setContent evita precisar de rota autenticada para o headless browser.
		// As imagens já vêm como data: URI, então nada aqui depende da rede —
		// exceto as webfonts, que ficam num "melhor esforço" com timeout curto.
		await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
		await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
		await page.evaluate(() => (document as any).fonts?.ready).catch(() => undefined);
		await page.emulateMedia({ media: 'print' });

		// As referências cruzadas são resolvidas AQUI, no DOM já montado, com a mesma
		// lógica que a página web usa — por busca no documento, não por posição na lista.
		const links = await page.evaluate(enhanceReferencesInPage);

		const pdf = await page.pdf({
			format: 'A4',
			printBackground: true,
			displayHeaderFooter: true,
			headerTemplate: header,
			footerTemplate: footer,
			margin: cfg.margin
		});

		// O Chromium grava os destinos dos links internos ignorando a margem superior:
		// sem isto, todo `[N]` cai acima do início do conteúdo e o leitor trava no
		// topo da página. Ver fixPdfDestinations.ts.
		return { pdf: fixPdfDestinations(pdf, toPoints(cfg.margin.top)), links };
	} finally {
		await browser.close();
	}
}

/**
 * Atalho síncrono com o banco: Paper ➜ PDF.
 * `baseUrl` é a origem pública, usada no QR e nos links.
 */
export async function renderArticlePdf(
	paper: any,
	variant: TemplateVariant = 'v3-1col',
	baseUrl = 'https://sciledger.org'
): Promise<{ pdf: Buffer; diagnostics: ResolveDiagnostics }> {
	const { tokens, diagnostics } = await resolveArticleTokens(paper, baseUrl);
	tokens.RUNNING_TITLE = runningTitle(tokens);
	const { pdf, links } = await renderTokensToPdf(tokens, variant);
	return {
		pdf,
		diagnostics: {
			...diagnostics,
			citationLinks: links.citations,
			referencesAnchored: links.resolved,
			citationsWithoutEntry: links.unresolved
		}
	};
}

/** HTML preenchido, sem passar pelo Chromium — usado pelo `?debug=html` do endpoint. */
export async function renderArticleHtml(
	paper: any,
	variant: TemplateVariant = 'v3-1col',
	baseUrl = 'https://sciledger.org'
): Promise<{ html: string; diagnostics: ResolveDiagnostics }> {
	const { tokens, diagnostics } = await resolveArticleTokens(paper, baseUrl);
	tokens.RUNNING_TITLE = runningTitle(tokens);
	return { html: renderTemplateHtml(tokens, variant), diagnostics };
}

function runningTitle(tokens: ArticleTokens): string {
	const first = String(tokens.AUTHORS ?? '')
		.split('&nbsp;·&nbsp;')[0]
		.replace(/<sup\b[^>]*>[\s\S]*?<\/sup\s*>/gi, '') // marcadores de afiliação não vão para o rodapé
		.replace(/<[^>]*>/g, '')
		.trim();
	if (!first) return String(tokens.TITLE ?? '').slice(0, 70);
	const multiple = String(tokens.AUTHORS ?? '').includes('&nbsp;·&nbsp;');
	return multiple ? `${first} et al.` : first;
}

/** Reexportado para quem monta tokens à mão (scripts de preview, testes). */
export { buildArticleTokens };
export type { ArticleTokens, BuildOptions };
