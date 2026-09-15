/**
 * The submission has one catalogue of institutions and, separately, an association saying
 * which of them each author uses and in what order. These are different things, and the
 * tests keep them apart the same way the editor does.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	MAX_AFFILIATIONS_PER_AUTHOR,
	affiliationDedupeKey,
	buildPaperAffiliationIndex,
	collectReusableAffiliations,
	extractOrcidAffiliations,
	normalizeAffiliationSnapshot,
	normalizeAuthorSnapshots
} from './paperAuthorAffiliations';

const UFRN = { organization: 'Universidade Federal do Rio Grande do Norte' };
const IMD = { organization: 'Instituto Metrópole Digital' };
const LAB = { organization: 'Laboratório X' };

const author = (id: string, affiliations: unknown[] = []) => ({
	userId: id, username: `@${id}`, name: id, affiliations
});

/** What the editor derives: the catalogue is assembled from the selected authors. */
const catalogue = (authors: any[], extra: unknown[] = []) =>
	collectReusableAffiliations([
		...normalizeAuthorSnapshots(authors).flatMap((a) => a.affiliations ?? []),
		...extra
	]);

describe('catalogue: the institutions this submission may draw on', () => {
	it('is empty when no selected author has an affiliation', () => {
		expect(catalogue([author('ada'), author('grace')])).toEqual([]);
	});

	it('holds the one affiliation of a single author', () => {
		expect(catalogue([author('ada', [UFRN])]).map((e) => e.affiliation.organization)).toEqual([
			'Universidade Federal do Rio Grande do Norte'
		]);
	});

	it('lists a shared institution once, however many authors carry it', () => {
		const entries = catalogue([
			author('ada', [UFRN]), author('grace', [UFRN]),
			author('tetsu', [UFRN]), author('leo', [UFRN])
		]);
		expect(entries).toHaveLength(1);
	});

	it('gathers the union when authors carry different institutions', () => {
		const entries = catalogue([
			author('ada', [UFRN]), author('grace', [UFRN, IMD]), author('tetsu', [UFRN, IMD, LAB])
		]);
		expect(entries.map((e) => e.affiliation.organization).sort()).toEqual([
			'Instituto Metrópole Digital', 'Laboratório X', 'Universidade Federal do Rio Grande do Norte'
		]);
	});

	it('takes in an affiliation typed on the page, through the same normalisation', () => {
		const typed = normalizeAffiliationSnapshot({
			organization: 'Universidade Nova', department: 'Departamento de Pesquisa',
			city: 'Natal', country: 'Brasil'
		});
		const entries = catalogue([author('ada', [UFRN])], [typed]);
		expect(entries.map((e) => e.affiliation.organization)).toContain('Universidade Nova');
		expect(entries.find((e) => e.affiliation.organization === 'Universidade Nova')!.displayName)
			.toContain('Departamento de Pesquisa');
	});

	it('grows when an author joins', () => {
		const before = catalogue([author('ada', [UFRN])]);
		const after = catalogue([author('ada', [UFRN]), author('tetsu', [UFRN, IMD, LAB])]);
		expect(before).toHaveLength(1);
		expect(after).toHaveLength(3);
	});

	it('keeps an institution another author is still using when one author leaves', () => {
		// Grace leaves; Ada still uses UFRN, so UFRN must not fall out of the catalogue.
		const after = catalogue([author('ada', [UFRN])]);
		expect(after.map((e) => e.affiliation.organization)).toEqual([
			'Universidade Federal do Rio Grande do Norte'
		]);
	});

	it('drops an institution once nobody uses it any more', () => {
		expect(catalogue([author('ada', [UFRN])]).some((e) => e.affiliation.organization === 'Laboratório X'))
			.toBe(false);
	});

	it('is not capped at three: the cap is per author', () => {
		const many = catalogue([
			author('ada', [UFRN, IMD, LAB]),
			author('grace', [{ organization: 'Universidade Y' }, { organization: 'Instituto Z' }])
		]);
		expect(many.length).toBe(5);
		expect(MAX_AFFILIATIONS_PER_AUTHOR).toBe(3);
	});

	it('folds an ORCID affiliation into the same catalogue rather than a parallel list', () => {
		const orcid = extractOrcidAffiliations({
			'activities-summary': {
				employments: { 'affiliation-group': [
					{ summaries: [{ 'employment-summary': { organization: { name: 'Instituto Metrópole Digital' } } }] }
				] }
			}
		});
		expect(catalogue([author('ada', [IMD])], orcid)).toHaveLength(1);
	});
});

describe('association: which catalogue entries an author uses, in order', () => {
	const assign = (affiliations: unknown[]) => normalizeAuthorSnapshots([author('ada', affiliations)])[0];

	it('records one, two or three affiliations for an author', () => {
		for (const list of [[UFRN], [UFRN, IMD], [UFRN, IMD, LAB]]) {
			expect(assign(list).affiliations).toHaveLength(list.length);
		}
	});

	it('keeps the chosen order rather than the catalogue order', () => {
		expect(assign([LAB, UFRN]).affiliations?.map((a) => a.organization)).toEqual([
			'Laboratório X', 'Universidade Federal do Rio Grande do Norte'
		]);
	});

	it('renumbers 1..n when a middle affiliation is cleared', () => {
		const before = buildPaperAffiliationIndex([assign([UFRN, IMD, LAB])]);
		expect(before.authorAffiliationIndexes[0]).toEqual([1, 2, 3]);
		const after = buildPaperAffiliationIndex([assign([UFRN, LAB])]);
		expect(after.authorAffiliationIndexes[0]).toEqual([1, 2]);
		expect(after.entries[1].affiliation.organization).toBe('Laboratório X');
	});

	it('reuses a catalogue entry by copying it, so the two are not the same object', () => {
		const [entry] = collectReusableAffiliations([UFRN]);
		const copy = { ...entry.affiliation, id: 'fresh-id' };
		expect(affiliationDedupeKey(copy)).toBe(entry.key);
		expect(copy).not.toBe(entry.affiliation);
	});
});

describe('the editor keeps catalogue and association apart', () => {
	const page = readFileSync(
		fileURLToPath(new URL('../Pages/Paper/PaperPublishPage.svelte', import.meta.url)), 'utf8'
	);

	it('derives one catalogue for the submission', () => {
		expect(page).toContain('let affiliationCatalogue = $derived(');
		expect(page).toContain('function addAffiliationToCatalogue()');
	});

	it('assigns from that catalogue into ordered slots, capped per author', () => {
		expect(page).toContain('function setAffiliationSlot(username: string, slot: number, key: string)');
		expect(page).toContain('if (next.length > MAX_AFFILIATIONS_PER_AUTHOR) return;');
		expect(page).toContain('next.splice(slot, 1);');
		expect(page).toContain('if (slotTaken(username, slot, key)) return;');
	});

	it('no longer edits institution fields inside each author card', () => {
		expect(page).not.toContain('author-affiliation-organization-');
		expect(page).not.toContain('author-affiliation-country-');
	});

	it('shows the catalogue only once authors are selected', () => {
		const section = page.indexOf('<section id="affiliations"');
		expect(section).toBeGreaterThan(-1);
		expect(page.slice(section, section + 1400)).toContain('{#if inputAuthorList.length === 0}');
	});
});
