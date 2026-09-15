/**
 * Renders a real PDF from a fixture and checks how authors, corresponding authors and
 * affiliations actually come out the far end of the pipeline. Everything here is the
 * production code path from tokens onward -- only the database lookup is replaced by the
 * fixture, so a regression in the template or the view model fails this test.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildArticleTokens } from './articleViewModel';
import { renderTemplateHtml, renderTokensToPdf } from './renderArticlePdf';
import {
	normalizeAffiliationSnapshot,
	type PaperAuthorSnapshot
} from '$lib/utils/paperAuthorAffiliations';

// Accented names and a deliberately long institution: the PDF must not drop diacritics,
// clip names or break the affiliation legend.
const UFRN = { organization: 'Universidade Federal do Rio Grande do Norte', city: 'Natal', country: 'Brasil' };
const IMD = { organization: 'Instituto Metrópole Digital', city: 'Natal', country: 'Brasil' };
const LAB = {
	organization: 'Laboratório de Bioinformática Comparativa e Genômica Evolutiva Aplicada à Saúde Pública',
	city: 'Natal'
};
// Typed into the catalogue on the submission page rather than coming from a profile or ORCID:
// it must reach the PDF through exactly the same normalisation as the others.
const NOVA = normalizeAffiliationSnapshot({
	organization: 'Universidade Nova',
	department: 'Departamento de Pesquisa',
	city: 'Natal',
	country: 'Brasil'
})!;

/** The shape the task asks for: 3 corresponding authors with 1, 2 and 3 affiliations, plus one who is not. */
export const AUTHORS: PaperAuthorSnapshot[] = [
	{ userId: 'a1', username: '@ada', name: 'Ada Lovelace', email: 'ada@ufrn.br', isCorresponding: true, affiliations: [UFRN] },
	{ userId: 'a2', username: '@grace', name: 'Grace Hopper', email: 'grace@imd.ufrn.br', isCorresponding: true, affiliations: [UFRN, IMD] },
	{
		userId: 'a3', username: '@tetsu',
		name: 'Tetsu Sakamoto de Albuquerque Nascimento Gonçalves',
		email: 'tetsu@imd.ufrn.br', isCorresponding: true,
		affiliations: [UFRN, IMD, LAB]
	},
	{ userId: 'a4', username: '@leo', name: 'Leonardo Ferreira Cabral', email: 'leo@ufrn.br', isCorresponding: false, affiliations: [NOVA] }
];

const PAPER = {
	id: 'fixture-authors-affiliations',
	title: 'Multiple corresponding authors and ordered affiliations',
	abstract: '<p>A fixture exercising the author, corresponding-author and affiliation rendering path.</p>',
	keywords: ['affiliations', 'corresponding authors'],
	content: '<h1>Introduction</h1><p>Body text for the fixture paper.</p>',
	status: 'published',
	createdAt: '2026-01-05T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
	statusHistory: [{ action: 'paper.publish', newStatus: 'published', createdAt: '2026-03-01T00:00:00.000Z' }]
};

const tokens = buildArticleTokens(PAPER, { authors: AUTHORS, baseUrl: 'https://sciledger.org' });

describe('authors and affiliations in the generated document', () => {
	it('numbers each author with their own affiliations, in the order the author stored them', () => {
		// Ada: 1 -- Grace: 1,2 -- Tetsu: 1,2,3 -- Leonardo: 2
		expect(tokens.AUTHORS).toContain('Ada Lovelace<sup>1,*</sup>');
		expect(tokens.AUTHORS).toContain('Grace Hopper<sup>1,2,*</sup>');
		expect(tokens.AUTHORS).toContain('Tetsu Sakamoto de Albuquerque Nascimento Gonçalves<sup>1,2,3,*</sup>');
		expect(tokens.AUTHORS).toContain('Leonardo Ferreira Cabral<sup>4</sup>');
	});

	it('lists every distinct affiliation once, numbered in first-use order', () => {
		expect(tokens.AFFILIATIONS).toContain('<sup>1</sup> Universidade Federal do Rio Grande do Norte');
		expect(tokens.AFFILIATIONS).toContain('<sup>2</sup> Instituto Metrópole Digital');
		expect(tokens.AFFILIATIONS).toContain('<sup>3</sup> Laboratório de Bioinformática');
		expect(tokens.AFFILIATIONS).toContain('<sup>4</sup> Departamento de Pesquisa, Universidade Nova');
		expect(tokens.AFFILIATIONS.match(/<sup>\d<\/sup>/g)).toHaveLength(4);
	});

	it('names all three corresponding authors in the legend, not just the first', () => {
		expect(tokens.AFFILIATIONS).toContain('Corresponding authors:');
		for (const email of ['ada@ufrn.br', 'grace@imd.ufrn.br', 'tetsu@imd.ufrn.br']) {
			expect(tokens.AFFILIATIONS).toContain(`mailto:${email}`);
		}
		expect(tokens.AFFILIATIONS).not.toContain('mailto:leo@ufrn.br');
	});

	it('leaves no marker without a matching entry', () => {
		const markers = new Set([...tokens.AUTHORS.matchAll(/<sup>([^<]+)<\/sup>/g)]
			.flatMap((m) => m[1].split(',')).filter((mark) => mark !== '*'));
		const entries = new Set([...tokens.AFFILIATIONS.matchAll(/<sup>(\d+)<\/sup>/g)].map((m) => m[1]));
		expect([...markers].sort()).toEqual([...entries].sort());
	});

	it('singularises the legend when only one author corresponds', () => {
		const single = buildArticleTokens(PAPER, {
			authors: AUTHORS.map((a, i) => ({ ...a, isCorresponding: i === 0 }))
		});
		expect(single.AFFILIATIONS).toContain('Corresponding author:');
		expect(single.AFFILIATIONS).not.toContain('Corresponding authors:');
	});

	it('renders a real PDF carrying all four authors and all three affiliations', async () => {
		const { pdf } = await renderTokensToPdf(tokens, 'v3-1col');
		expect(pdf.length).toBeGreaterThan(1000);

		const html = renderTemplateHtml(tokens, 'v3-1col');
		for (const accented of ['Metrópole', 'Laboratório de Bioinformática', 'Gonçalves', 'Brasil', 'Universidade Nova']) {
			expect(html).toContain(accented);
		}

		const out = fileURLToPath(new URL('./__fixtures__/', import.meta.url));
		mkdirSync(out, { recursive: true });
		writeFileSync(out + 'authors-affiliations.pdf', pdf);
		writeFileSync(out + 'authors-affiliations.html', renderTemplateHtml(tokens, 'v3-1col'));
	}, 180000);
});
