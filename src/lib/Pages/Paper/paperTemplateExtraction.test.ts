import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import mammoth from 'mammoth';

/**
 * O template de submissao e lido pela plataforma: o autor sobe o .docx, o
 * mammoth converte para HTML e a extracao tira Title, Abstract e Keywords dele.
 * Trocar o template pode quebrar isso em silencio -- o arquivo abre no Word
 * normalmente e so a submissao sai sem metadados.
 *
 * Este teste roda a extracao DE VERDADE: as funcoes sao recortadas do proprio
 * `PaperPublishPage.svelte` e compiladas, em vez de reescritas aqui. Uma copia
 * das regex neste arquivo provaria apenas que a copia funciona.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const componentPath = resolve(here, 'PaperPublishPage.svelte');

const EXTRACTION_BLOCK_START = 'function cleanHtmlText(';
const EXTRACTION_BLOCK_END = 'function isMainDocumentBusy(';

type Extraction = {
	extractTitleFromHtml: (html: string) => string;
	extractAbstractFromHtml: (html: string) => string;
	extractKeywordsFromHtml: (html: string) => string[];
};

/** Recorta o bloco de extracao do componente e o torna executavel. */
async function loadRealExtraction(): Promise<Extraction> {
	const source = readFileSync(componentPath, 'utf8');
	const start = source.indexOf(EXTRACTION_BLOCK_START);
	const end = source.indexOf(EXTRACTION_BLOCK_END);

	expect(start, 'bloco de extracao nao encontrado no componente').toBeGreaterThan(-1);
	expect(end, 'fim do bloco de extracao nao encontrado').toBeGreaterThan(start);

	const block = source.slice(start, end);
	const module = `${block}
export { extractTitleFromHtml, extractAbstractFromHtml, extractKeywordsFromHtml };`;

	const { code } = await transform(module, { loader: 'ts', format: 'esm' });
	return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

async function convert(relativePath: string): Promise<string> {
	const buffer = readFileSync(resolve(repoRoot, relativePath));
	const result = await mammoth.convertToHtml({ buffer });
	return result.value;
}


/** HTML sem os data: URIs, para varrer texto sem cair no base64 das imagens. */
function textOnly(value: string): string {
	return value.replace(/src="data:[^"]*"/g, 'src=""');
}

let html = '';
let extraction: Extraction;

beforeAll(async () => {
	[html, extraction] = await Promise.all([
		convert('static/paper-template.docx'),
		loadRealExtraction()
	]);
}, 60_000);

describe('template de submissao: extracao de metadados', () => {
	it('extrai o titulo', () => {
		const title = extraction.extractTitleFromHtml(html);

		expect(title.length).toBeGreaterThan(10);
		expect(title.toLowerCase()).toContain('sample size');
		// O titulo nao pode ser uma das secoes nem a linha de keywords.
		expect(title.toLowerCase()).not.toMatch(/^(abstract|keywords|introduction)/);
	});

	it('nao coloca nenhum bloco antes do titulo', () => {
		// A divisao por primeira frase (caminho do navegador) le o PRIMEIRO bloco
		// do documento como titulo. Qualquer paragrafo acima dele -- um bloco de
		// autores, por exemplo -- passaria a ser lido como titulo.
		const firstBlock = html.match(/<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/i);

		expect(firstBlock).not.toBeNull();
		expect(firstBlock?.[1].toLowerCase()).toContain('sample size');
	});

	it('mantem o titulo sem ponto final', () => {
		// A divisao por primeira frase corta o bloco na primeira pontuacao final:
		// um ponto no titulo faria o resto dele virar o resumo.
		const firstBlock = html.match(/<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/i);
		const text = (firstBlock?.[1] ?? '').replace(/<[^>]*>/g, '');

		expect(text).not.toMatch(/[.!?](\s|$)/);
	});

	it('extrai o resumo pelo CAMINHO PRIMARIO, nao por um fallback', () => {
		// O caminho primario exige um heading de resumo limpo. O template anterior
		// nao satisfazia esta condicao: o Word gravava uma ancora de favorito
		// dentro do heading (<h1><a id="_heading=..."></a> ABSTRACT</h1>) e o
		// regex nao casava, de modo que o resumo vinha sempre do fallback.
		const primaryPathHeading =
			/<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;

		expect(primaryPathHeading.test(html)).toBe(true);

		const abstract = extraction.extractAbstractFromHtml(html);
		expect(abstract.length).toBeGreaterThan(100);
		expect(abstract.toLowerCase()).toContain('template');
	});

	it('nao devolve a linha de keywords nem um heading como resumo', () => {
		const abstract = extraction.extractAbstractFromHtml(html).replace(/<[^>]*>/g, '').trim();

		expect(abstract.toLowerCase()).not.toMatch(/^keywords/);
		expect(abstract.toLowerCase()).not.toMatch(/^(abstract|introduction)$/);
	});

	it('extrai as keywords', () => {
		const keywords = extraction.extractKeywordsFromHtml(html);

		expect(keywords.length).toBeGreaterThanOrEqual(3);
		expect(keywords.map((k) => k.toLowerCase())).toContain('worked example');
		// O rotulo nao pode entrar como se fosse um termo.
		expect(keywords.map((k) => k.toLowerCase())).not.toContain('keywords');
	});
});

describe('template de submissao: estrutura do documento', () => {
	it('mantem a hierarquia de secoes que a conversao usa', () => {
		for (const heading of [
			'ABSTRACT',
			'INTRODUCTION',
			'MATERIALS AND METHODS',
			'RESULTS',
			'DISCUSSION',
			'CONCLUSION',
			'REFERENCES'
		]) {
			expect(html).toContain(`<h1>${heading}</h1>`);
		}
		expect(html).toMatch(/<h2>[^<]+<\/h2>/);
	});

	it('traz uma tabela de verdade, nao a imagem de uma tabela', () => {
		expect(html).toContain('<table');
		// Cabecalho mais linhas de dados: uma tabela com conteudo, nao uma casca.
		expect((html.match(/<td/g) ?? []).length).toBeGreaterThan(10);
	});

	it('traz uma figura embutida', () => {
		expect(html).toMatch(/<img[^>]+src="data:image\//);
	});

	it('preserva legendas e as mencoes a elas no texto', () => {
		expect(html).toContain('Table 1.');
		expect(html).toContain('Figure 1.');
		expect(html).toContain('(Table 1)');
		expect(html).toContain('(Fig. 1)');
	});

	it('traz referencias de exemplo marcadas como ficticias', () => {
		expect(html).toContain('[fictitious reference]');
		expect(html).toMatch(/\[1\]/);
	});
});

describe('template de submissao: identidade', () => {
	it('nao carrega nada da revista anterior', () => {
		// Sem os data: URIs -- o base64 de uma imagem contem qualquer sequencia de
		// letras por acaso, e varrer isso daria falso positivo.
		const lowered = textOnly(html).toLowerCase();

		for (const leftover of [
			'fungal',
			'mycolog',
			'tulostoma',
			'bruno.goto',
			'ufrn',
			'issn',
			'accepted by',
			'fungalinsghts'
		]) {
			expect(lowered, `sobrou conteudo da revista anterior: ${leftover}`).not.toContain(leftover);
		}
	});

	it('nao inventa periodico, DOI, ISSN ou volume para o SciLedger', () => {
		// SciLedger e a plataforma, nao uma revista.
		const text = textOnly(html);
		expect(text).not.toMatch(/\bDOI\s*[:\s]*10\./i);
		expect(text).not.toMatch(/\bISSN\b/i);
		expect(text).not.toMatch(/\bvolume\s*\d+\s*\(\s*\d+\s*\)/i);
	});

	it('explica ao autor como usar o modelo', () => {
		expect(html).toContain('HOW TO USE THIS TEMPLATE');
		expect(html.toLowerCase()).toContain('submission form');
	});
});
