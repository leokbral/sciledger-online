import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	MAX_CORRESPONDING_AUTHORS,
	buildPaperAffiliationIndex,
	extractOrcidAffiliations,
	getMarkedCorrespondingAuthors,
	normalizeAuthorSnapshots,
	reconcileCorrespondingAuthors
} from './paperAuthorAffiliations';

const UFRN = { organization: 'Universidade Federal do Rio Grande do Norte' };
const IMD = { organization: 'Instituto Metrópole Digital' };
const LAB = { organization: 'Laboratório X' };

const author = (id: string, isCorresponding = false, affiliations: unknown[] = []) => ({
	userId: id,
	username: `@${id}`,
	name: id,
	isCorresponding,
	affiliations
});

const ids = (authors: any[]) => new Set(authors.map((a) => a.userId));

describe('corresponding authors: how many a paper may name', () => {
	for (const count of [0, 1, 2, 3]) {
		it(`accepts ${count}`, () => {
			const authors = normalizeAuthorSnapshots(
				Array.from({ length: 4 }, (_u, i) => author(`a${i + 1}`, i < count))
			);
			const result = reconcileCorrespondingAuthors({ authors, authorIds: ids(authors) });
			expect(result.ok).toBe(true);
			expect(result.correspondingAuthorIds).toHaveLength(count);
		});
	}

	it('rejects a fourth', () => {
		const authors = normalizeAuthorSnapshots(
			Array.from({ length: 4 }, (_u, i) => author(`a${i + 1}`, true))
		);
		const result = reconcileCorrespondingAuthors({ authors, authorIds: ids(authors) });
		expect(result.ok).toBe(false);
		expect(result.message).toContain(`at most ${MAX_CORRESPONDING_AUTHORS}`);
	});

	it('keeps every mark instead of collapsing them to the single reference', () => {
		const authors = normalizeAuthorSnapshots([author('a1', true), author('a2', true), author('a3', false)]);
		const result = reconcileCorrespondingAuthors({
			authors,
			correspondingAuthor: 'a1',
			authorIds: ids(authors)
		});
		expect(result.ok).toBe(true);
		expect(getMarkedCorrespondingAuthors(result.authors).map((a) => a.userId)).toEqual(['a1', 'a2']);
		expect(result.primaryCorrespondingAuthorId).toBe('a1');
	});

	it('seeds the flag from a legacy paper that only carries the single reference', () => {
		const authors = normalizeAuthorSnapshots([author('a1'), author('a2')]);
		const result = reconcileCorrespondingAuthors({ authors, correspondingAuthor: 'a2', authorIds: ids(authors) });
		expect(result.ok).toBe(true);
		expect(result.correspondingAuthorIds).toEqual(['a2']);
	});

	it('refuses a reference that contradicts the marks rather than quietly picking one', () => {
		const authors = normalizeAuthorSnapshots([author('a1', true), author('a2')]);
		const result = reconcileCorrespondingAuthors({ authors, correspondingAuthor: 'a2', authorIds: ids(authors) });
		expect(result.ok).toBe(false);
		expect(result.message).toContain('does not match');
	});

	it('refuses a corresponding author who is not on the paper', () => {
		const authors = normalizeAuthorSnapshots([author('a1', true)]);
		const result = reconcileCorrespondingAuthors({ authors, authorIds: new Set(['someone-else']) });
		expect(result.ok).toBe(false);
		expect(result.message).toContain('among the paper authors');
	});

	it('still demands at least one when the paper is being submitted', () => {
		const authors = normalizeAuthorSnapshots([author('a1'), author('a2')]);
		expect(reconcileCorrespondingAuthors({ authors, requireOne: true }).ok).toBe(false);
		const marked = normalizeAuthorSnapshots([author('a1', true), author('a2', true)]);
		expect(reconcileCorrespondingAuthors({ authors: marked, requireOne: true }).ok).toBe(true);
	});
});

describe('affiliation order and the tags derived from it', () => {
	it('keeps the order the author chose, rather than sorting it', () => {
		const [snapshot] = normalizeAuthorSnapshots([author('a1', false, [LAB, UFRN, IMD])]);
		expect(snapshot.affiliations?.map((a) => a.organization)).toEqual([
			'Laboratório X',
			'Universidade Federal do Rio Grande do Norte',
			'Instituto Metrópole Digital'
		]);
	});

	it('numbers an author 1..n contiguously, and renumbers when one is removed', () => {
		const three = normalizeAuthorSnapshots([author('a1', false, [UFRN, IMD, LAB])]);
		expect(buildPaperAffiliationIndex(three).authorAffiliationIndexes[0]).toEqual([1, 2, 3]);

		// drop the middle one: the third must become the second, never stay "3"
		const two = normalizeAuthorSnapshots([author('a1', false, [UFRN, LAB])]);
		const index = buildPaperAffiliationIndex(two);
		expect(index.authorAffiliationIndexes[0]).toEqual([1, 2]);
		expect(index.entries.map((e) => e.affiliation.organization)).toEqual([
			'Universidade Federal do Rio Grande do Norte',
			'Laboratório X'
		]);
	});

	it('renumbers on reorder', () => {
		const reordered = normalizeAuthorSnapshots([author('a1', false, [IMD, UFRN])]);
		expect(buildPaperAffiliationIndex(reordered).entries.map((e) => e.affiliation.organization)).toEqual([
			'Instituto Metrópole Digital',
			'Universidade Federal do Rio Grande do Norte'
		]);
	});

	it('treats manual, reused and ORCID affiliations through the same normalisation', () => {
		const orcid = extractOrcidAffiliations({
			'activities-summary': {
				employments: {
					'affiliation-group': [
						{ summaries: [{ 'employment-summary': { organization: { name: 'Instituto Metrópole Digital' } } }] }
					]
				}
			}
		});
		// the ORCID entry and the typed one are the same institution, so they collapse
		const [snapshot] = normalizeAuthorSnapshots([author('a1', false, [UFRN, ...orcid, IMD])]);
		expect(snapshot.affiliations).toHaveLength(2);
		expect(buildPaperAffiliationIndex([snapshot]).authorAffiliationIndexes[0]).toEqual([1, 2]);
	});

	it('survives a save/reload round trip with order and marks intact', () => {
		const saved = normalizeAuthorSnapshots([author('a1', true, [UFRN, IMD]), author('a2', true, [LAB])]);
		const reloaded = normalizeAuthorSnapshots(JSON.parse(JSON.stringify(saved)));
		expect(reloaded).toEqual(saved);
		expect(getMarkedCorrespondingAuthors(reloaded)).toHaveLength(2);
		expect(reloaded[0].affiliations?.map((a) => a.organization)).toEqual([
			'Universidade Federal do Rio Grande do Norte',
			'Instituto Metrópole Digital'
		]);
	});
});

describe('the editor derives tags instead of asking the user to type them', () => {
	const page = readFileSync(
		fileURLToPath(new URL('../Pages/Paper/PaperPublishPage.svelte', import.meta.url)),
		'utf8'
	);

	it('builds the tags from the author\'s own affiliation list, numbered by position', () => {
		expect(page).toContain('function affiliationTags(username: string)');
		expect(page).toContain('return affiliationsFor(username).map((affiliation, position) => ({');
		expect(page).toContain('n: position + 1');
	});

	it('shows affiliation as its own section, ahead of the author details', () => {
		const affiliationAt = page.indexOf('>Affiliation</p>');
		const detailsAt = page.indexOf('>Author details</p>');
		expect(affiliationAt).toBeGreaterThan(-1);
		expect(detailsAt).toBeGreaterThan(affiliationAt);
	});

	it('caps the corresponding-author checkboxes and says why the next one is blocked', () => {
		expect(page).toContain('function toggleCorrespondingAuthor(username: string)');
		expect(page).toContain('if (turningOn && correspondingCount() >= MAX_CORRESPONDING_AUTHORS) return;');
		expect(page).toContain('This paper already names {MAX_CORRESPONDING_AUTHORS} corresponding authors.');
		// a radio group could never hold more than one
		expect(page).not.toContain('name="corresponding-author"');
	});
});
