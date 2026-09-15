import { describe, expect, it } from 'vitest';
import { PaperSchema } from '$lib/db/schemas/PaperSchema';
import {
	buildPaperAffiliationIndex,
	extractOrcidAffiliations,
	formatAffiliationIndexes,
	markCorrespondingAuthor,
	normalizeAuthorSnapshot,
	normalizeAuthorSnapshots,
	validateCorrespondingAuthorSelection,
	type PaperAuthorSnapshot
} from './paperAuthorAffiliations';

function createOrcidProfile() {
	return {
		person: {
			name: {
				'given-names': { value: 'Ada' },
				'family-name': { value: 'Lovelace' }
			}
		},
		'activities-summary': {
			employments: {
				'affiliation-group': [
					{
						summaries: [
							{
								'employment-summary': {
									'put-code': 10,
									'role-title': 'Researcher',
									'department-name': 'Computing',
									organization: {
										name: 'Analytical Engine Lab',
										address: {
											city: 'London',
											region: 'England',
											country: 'GB'
										},
										'disambiguated-organization': {
											'disambiguated-organization-identifier': 'https://ror.org/05abcde11',
											'disambiguation-source': 'ROR'
										}
									}
								}
							}
						]
					}
				]
			}
		}
	};
}

function author(overrides: Partial<PaperAuthorSnapshot> = {}): PaperAuthorSnapshot {
	return {
		userId: 'author-1',
		username: '@author1',
		name: 'Author One',
		affiliations: [],
		...overrides
	};
}

describe('paper author affiliations', () => {
	it('allows a draft with zero corresponding authors', () => {
		const result = validateCorrespondingAuthorSelection([author()], { requireOne: false });

		expect(result.ok).toBe(true);
	});

	it('allows one corresponding author', () => {
		const result = validateCorrespondingAuthorSelection([
			author({ isCorresponding: true })
		]);

		expect(result.ok).toBe(true);
	});

	it('selecting a new corresponding author removes the previous flag', () => {
		const authors = [
			author({ userId: 'author-1', username: '@one', isCorresponding: true }),
			author({ userId: 'author-2', username: '@two', isCorresponding: false })
		];

		expect(markCorrespondingAuthor(authors, 'author-2').map((item) => item.isCorresponding)).toEqual([
			false,
			true
		]);
	});

	it('accepts up to three corresponding authors and rejects a fourth, in step with the schema', () => {
		const marked = (count: number) =>
			Array.from({ length: count }, (_unused, i) =>
				author({ userId: `author-${i + 1}`, isCorresponding: true })
			);
		// The mongoose validator is the last line of defence; it must agree with the pure rule,
		// otherwise a payload could pass validation and still be refused at write time.
		const schemaValidator = (PaperSchema.path('authorAffiliations') as any).validators.find(
			(validator: any) => String(validator.message).includes('corresponding authors')
		);

		for (const count of [0, 1, 2, 3]) {
			expect(validateCorrespondingAuthorSelection(marked(count)).ok).toBe(true);
			expect(schemaValidator.validator(marked(count))).toBe(true);
		}

		expect(validateCorrespondingAuthorSelection(marked(4)).ok).toBe(false);
		expect(validateCorrespondingAuthorSelection(marked(4)).message).toContain('at most 3');
		expect(schemaValidator.validator(marked(4))).toBe(false);
	});

	it('requires at least one corresponding author for submission validation', () => {
		expect(validateCorrespondingAuthorSelection([author()], { requireOne: true })).toMatchObject({
			ok: false
		});
		expect(
			validateCorrespondingAuthorSelection([author({ isCorresponding: true })], { requireOne: true })
		).toMatchObject({ ok: true });
	});

	it('maps ORCID affiliation data into a structured affiliation snapshot', () => {
		const [affiliation] = extractOrcidAffiliations(createOrcidProfile());

		expect(affiliation).toMatchObject({
			organization: 'Analytical Engine Lab',
			department: 'Computing',
			roleTitle: 'Researcher',
			city: 'London',
			region: 'England',
			country: 'GB',
			rorId: '05abcde11'
		});
	});

	it('persists ORCID affiliation data into the paper author snapshot shape', () => {
		const [affiliation] = extractOrcidAffiliations(createOrcidProfile());
		const snapshot = normalizeAuthorSnapshot({
			userId: 'ada-1',
			username: '@ada',
			name: 'Ada Lovelace',
			orcid: '0000-0001-0002-0003',
			affiliations: [affiliation]
		});

		expect(snapshot?.affiliations?.[0]).toMatchObject({
			organization: 'Analytical Engine Lab',
			rorId: '05abcde11'
		});
	});

	it('provides preview data with affiliation indexes', () => {
		const snapshot = author({
			affiliations: [{ organization: 'University A', displayName: 'University A' }]
		});
		const index = buildPaperAffiliationIndex([snapshot]);

		expect(index.entries[0]?.displayName).toBe('University A');
		expect(formatAffiliationIndexes(index.authorAffiliationIndexes[0])).toBe('1');
	});

	it('allows one author to have two affiliations', () => {
		const snapshot = normalizeAuthorSnapshot({
			name: 'Author One',
			affiliations: [{ organization: 'University A' }, { organization: 'Institute B' }]
		});

		expect(snapshot?.affiliations).toHaveLength(2);
	});

	it('allows two authors to share one affiliation', () => {
		const index = buildPaperAffiliationIndex([
			author({ userId: 'a1', affiliations: [{ organization: 'University A' }] }),
			author({ userId: 'a2', affiliations: [{ organization: 'University A' }] })
		]);

		expect(index.entries).toHaveLength(1);
	});

	it('reuses the same index for shared affiliations', () => {
		const index = buildPaperAffiliationIndex([
			author({ userId: 'a1', affiliations: [{ organization: 'University A' }] }),
			author({ userId: 'a2', affiliations: [{ organization: 'University A' }] })
		]);

		expect(index.authorAffiliationIndexes).toEqual([[1], [1]]);
	});

	it('assigns both indexes to one author with two affiliations', () => {
		const index = buildPaperAffiliationIndex([
			author({
				affiliations: [{ organization: 'University A' }, { organization: 'Institute B' }]
			})
		]);

		expect(index.authorAffiliationIndexes[0]).toEqual([1, 2]);
	});

	it('updates paper affiliation indexes after one affiliation is removed', () => {
		const index = buildPaperAffiliationIndex([
			author({
				affiliations: [{ organization: 'Institute B' }]
			})
		]);

		expect(index.entries).toHaveLength(1);
		expect(index.entries[0]?.displayName).toBe('Institute B');
	});

	it('renders legacy single-string affiliation records', () => {
		const [snapshot] = normalizeAuthorSnapshots([
			{
				name: 'Legacy Author',
				department: 'Biology',
				affiliation: 'University A'
			}
		]);

		expect(snapshot.affiliations?.[0]).toMatchObject({
			department: 'Biology',
			organization: 'University A',
			displayName: 'Biology, University A'
		});
	});

	it('loads existing paper authors without affiliation', () => {
		const snapshot = normalizeAuthorSnapshot({
			name: 'No Affiliation Author'
		});

		expect(snapshot?.affiliations).toEqual([]);
	});

	it('renders a corresponding author with multiple affiliations', () => {
		const snapshot = author({
			isCorresponding: true,
			affiliations: [{ organization: 'University A' }, { organization: 'Institute B' }]
		});
		const index = buildPaperAffiliationIndex([snapshot]);
		const previewName = `${snapshot.name}<sup>${formatAffiliationIndexes(
			index.authorAffiliationIndexes[0]
		)}</sup><sup>*</sup>`;

		expect(previewName).toBe('Author One<sup>12</sup><sup>*</sup>');
	});
});
