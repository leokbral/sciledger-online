import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	MAX_AFFILIATIONS_PER_AUTHOR,
	collectReusableAffiliations,
	dedupeAffiliations,
	extractOrcidAffiliations,
	hasAffiliation,
	normalizeAuthorSnapshots,
	validateAuthorAffiliationLimits,
	type PaperAuthorAffiliationSnapshot
} from './paperAuthorAffiliations';

const UFRN = { organization: 'Universidade Federal do Rio Grande do Norte', city: 'Natal' };
const IMD = { organization: 'Instituto Metropole Digital', city: 'Natal' };
const LAB = { organization: 'Laboratorio X' };
const EXTRA = { organization: 'Another Institute' };

function author(name: string, affiliations: unknown[]) {
	return { userId: `id-${name}`, username: name, name, affiliations };
}

/** The server path: whatever the client posts goes through normalize, then the limit check. */
function save(authors: unknown[]) {
	const normalized = normalizeAuthorSnapshots(authors);
	return { normalized, result: validateAuthorAffiliationLimits(normalized) };
}

describe('1 - a single affiliation', () => {
	it('is accepted and kept intact', () => {
		const { normalized, result } = save([author('ada', [UFRN])]);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(1);
		expect(normalized[0].affiliations?.[0].organization).toBe(UFRN.organization);
	});
});

describe('2 - exactly three affiliations', () => {
	it('is accepted, since three is the limit and not one past it', () => {
		const { normalized, result } = save([author('ada', [UFRN, IMD, LAB])]);
		expect(MAX_AFFILIATIONS_PER_AUTHOR).toBe(3);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(3);
	});
});

describe('3 - a fourth affiliation', () => {
	it('is rejected with a message naming the author', () => {
		const { result } = save([author('ada', [UFRN, IMD, LAB, EXTRA])]);
		expect(result.ok).toBe(false);
		expect(result.count).toBe(4);
		expect(result.message).toContain('ada');
		expect(result.message).toContain('at most 3');
	});

	it('is rejected no matter which author on the paper carries it', () => {
		const { result } = save([
			author('ada', [UFRN]),
			author('grace', [UFRN, IMD, LAB, EXTRA])
		]);
		expect(result.ok).toBe(false);
		expect(result.message).toContain('grace');
	});
});

describe('4 - the same affiliation twice', () => {
	it('collapses to one instead of consuming a second slot', () => {
		const { normalized, result } = save([author('ada', [UFRN, IMD, UFRN])]);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(2);
	});

	it('treats a differently-cased organization as the same institution', () => {
		const deduped = dedupeAffiliations([
			{ organization: 'UFRN' },
			{ organization: 'ufrn' }
		] as PaperAuthorAffiliationSnapshot[]);
		expect(deduped).toHaveLength(1);
	});

	it('matches on ROR id even when the typed name differs', () => {
		const deduped = dedupeAffiliations([
			{ organization: 'UFRN', rorId: 'https://ror.org/04wn09761' },
			{ organization: 'Univ. Federal do RN', rorId: 'ror:04wn09761' }
		] as PaperAuthorAffiliationSnapshot[]);
		expect(deduped).toHaveLength(1);
	});

	it('lets four entries through when two of them are the same institution', () => {
		const { normalized, result } = save([author('ada', [UFRN, IMD, LAB, UFRN])]);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(3);
	});
});

describe('5 - reuse', () => {
	it('offers each known affiliation once, so it never has to be retyped', () => {
		const reusable = collectReusableAffiliations([UFRN, IMD, UFRN, null, undefined, {}]);
		expect(reusable).toHaveLength(2);
		expect(reusable.map((entry) => entry.displayName)).toEqual([
			'Instituto Metropole Digital, Natal',
			'Universidade Federal do Rio Grande do Norte, Natal'
		]);
	});

	it('reports what an author already has, so the UI can disable that entry', () => {
		const existing = normalizeAuthorSnapshots([author('ada', [UFRN])])[0].affiliations ?? [];
		expect(hasAffiliation(existing, UFRN as PaperAuthorAffiliationSnapshot)).toBe(true);
		expect(hasAffiliation(existing, IMD as PaperAuthorAffiliationSnapshot)).toBe(false);
	});

	it('reuses the stored values rather than asking for them again', () => {
		const [reused] = collectReusableAffiliations([UFRN]);
		expect(reused.affiliation.organization).toBe(UFRN.organization);
		expect(reused.affiliation.city).toBe('Natal');
	});
});

describe('6 - persistence', () => {
	it('survives a save/reload round trip unchanged', () => {
		const saved = normalizeAuthorSnapshots([author('ada', [UFRN, IMD])]);
		const reloaded = normalizeAuthorSnapshots(JSON.parse(JSON.stringify(saved)));
		expect(reloaded).toEqual(saved);
		expect(validateAuthorAffiliationLimits(reloaded).ok).toBe(true);
	});
});

describe('7 - multiple authors', () => {
	it('applies the limit per author, not per paper', () => {
		const { normalized, result } = save([
			author('ada', [UFRN, IMD, LAB]),
			author('grace', [UFRN, IMD, LAB])
		]);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(3);
		expect(normalized[1].affiliations).toHaveLength(3);
	});

	it("does not let one author consume another author's slots", () => {
		const { result } = save([author('ada', [UFRN, IMD]), author('grace', [LAB, EXTRA])]);
		expect(result.ok).toBe(true);
	});
});

describe('9 - papers created before this change', () => {
	it('still loads a legacy author stored as flat institution + department strings', () => {
		const [snapshot] = normalizeAuthorSnapshots([
			{ name: 'Legacy Author', affiliation: 'Old University', department: 'Physics' }
		]);
		expect(snapshot.affiliations).toHaveLength(1);
		expect(snapshot.affiliations?.[0].organization).toBe('Old University');
		expect(validateAuthorAffiliationLimits([snapshot]).ok).toBe(true);
	});

	it('still loads an author with no affiliation at all', () => {
		const [snapshot] = normalizeAuthorSnapshots([{ name: 'Bare Author' }]);
		expect(snapshot.affiliations).toEqual([]);
		expect(validateAuthorAffiliationLimits([snapshot]).ok).toBe(true);
	});

	it('reads an over-limit historical paper without throwing, so it stays openable', () => {
		const normalized = normalizeAuthorSnapshots([author('ada', [UFRN, IMD, LAB, EXTRA])]);
		expect(normalized[0].affiliations).toHaveLength(4);
		expect(validateAuthorAffiliationLimits(normalized).ok).toBe(false);
	});
});

describe('10 - authors added through ORCID', () => {
	const orcidProfile = {
		'activities-summary': {
			employments: {
				'affiliation-group': [
					{
						summaries: [
							{
								'employment-summary': {
									'put-code': 1,
									'department-name': 'Physics',
									organization: {
										name: 'Universidade Federal do Rio Grande do Norte',
										address: { city: 'Natal', region: 'RN', country: 'BR' }
									}
								}
							}
						]
					}
				]
			}
		}
	};

	it('still extracts affiliations from an ORCID record', () => {
		const affiliations = extractOrcidAffiliations(orcidProfile);
		expect(affiliations).toHaveLength(1);
		expect(affiliations[0].organization).toBe(UFRN.organization);
	});

	it('feeds them through the same limit and dedupe rules', () => {
		const fromOrcid = extractOrcidAffiliations(orcidProfile);
		const { normalized, result } = save([author('ada', [...fromOrcid, ...fromOrcid, IMD])]);
		expect(result.ok).toBe(true);
		expect(normalized[0].affiliations).toHaveLength(2);
	});

	it('offers ORCID affiliations for reuse alongside typed ones', () => {
		const reusable = collectReusableAffiliations([...extractOrcidAffiliations(orcidProfile), LAB]);
		expect(reusable.map((entry) => entry.affiliation.organization)).toContain(UFRN.organization);
		expect(reusable.map((entry) => entry.affiliation.organization)).toContain('Laboratorio X');
	});
});

describe('8 - authorization and server-side enforcement', () => {
	const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
	const editServer = read('../../routes/(app)/publish/edit/[slug]/+server.ts');
	const newServer = read('../../routes/(app)/publish/new/+server.ts');

	it('runs the limit check on both save endpoints, not only in the form', () => {
		for (const source of [editServer, newServer]) {
			expect(source).toContain('validateAuthorAffiliationLimits');
			expect(source).toContain('affiliationLimit.ok');
			expect(source).toContain('{ status: 400 }');
		}
	});

	it('keeps the existing paper.edit authorization ahead of any affiliation write', () => {
		const authorizeAt = editServer.indexOf("authorize(user, 'paper.edit'");
		// the call site, not the import line at the top of the file
		const affiliationAt = editServer.indexOf('validateAuthorAffiliationLimits(normalizedAuthorAffiliations)');
		expect(authorizeAt).toBeGreaterThan(-1);
		expect(affiliationAt).toBeGreaterThan(authorizeAt);
		expect(editServer).toContain("{ status: 403 }");
	});

	it('reuses the existing authorization service rather than adding another one', () => {
		expect(editServer).toContain("from '$lib/server/authorization/authorizationService'");
	});
});
