export interface PaperAuthorAffiliationSnapshot {
	id?: string;
	organization?: string;
	department?: string;
	roleTitle?: string;
	city?: string;
	region?: string;
	country?: string;
	rorId?: string;
	displayName?: string;
}

export interface PaperAuthorSnapshot {
	userId?: string;
	username?: string;
	name: string;
	email?: string;
	orcid?: string;
	isCorresponding?: boolean;
	department?: string;
	affiliation?: string;
	affiliations?: PaperAuthorAffiliationSnapshot[];
}

export interface IndexedPaperAffiliation {
	index: number;
	key: string;
	displayName: string;
	affiliation: PaperAuthorAffiliationSnapshot;
}

export interface PaperAffiliationIndex {
	entries: IndexedPaperAffiliation[];
	authorAffiliationIndexes: number[][];
}

const AFFILIATION_COLLECTION_KEYS = [
	'employments',
	'educations',
	'qualifications',
	'invited-positions',
	'memberships',
	'services',
	'distinctions'
];

const AFFILIATION_SUMMARY_KEYS = [
	'employment-summary',
	'education-summary',
	'qualification-summary',
	'invited-position-summary',
	'membership-summary',
	'service-summary',
	'distinction-summary'
];

const SUPERSCRIPT_DIGITS: Record<string, string> = {
	'0': '0',
	'1': '1',
	'2': '2',
	'3': '3',
	'4': '4',
	'5': '5',
	'6': '6',
	'7': '7',
	'8': '8',
	'9': '9'
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function normalizeAuthorText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value).replace(/\s+/g, ' ').trim()
		: '';
}

function normalizeIdentity(value: unknown): string {
	return normalizeAuthorText(value).toLowerCase();
}

function normalizeRorId(value: unknown): string {
	const rawValue = normalizeAuthorText(value);
	if (!rawValue) return '';
	return rawValue.replace(/^https?:\/\/ror\.org\//i, '').replace(/^ror:/i, '').trim();
}

function getNestedRecord(source: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
	const value = source?.[key];
	return asRecord(value);
}

function getNestedText(source: Record<string, unknown> | null, key: string): string {
	return normalizeAuthorText(source?.[key]);
}

function getAuthorNameFromRecord(record: Record<string, unknown>): string {
	const explicitName = normalizeAuthorText(record.name);
	if (explicitName) return explicitName;

	const firstName = normalizeAuthorText(record.firstName);
	const lastName = normalizeAuthorText(record.lastName);
	const fullName = `${firstName} ${lastName}`.trim();
	if (fullName) return fullName;

	const username = normalizeAuthorText(record.username);
	if (username) return username;

	return normalizeAuthorText(record.email);
}

export function getAuthorReferenceId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return normalizeAuthorText(value);

	const record = asRecord(value);
	if (!record) return '';

	return (
		normalizeAuthorText(record.userId) ||
		normalizeAuthorText(record.id) ||
		normalizeAuthorText(record._id)
	);
}

export function formatAffiliationDisplayName(affiliation: PaperAuthorAffiliationSnapshot): string {
	const primary = [affiliation.department, affiliation.organization]
		.map(normalizeAuthorText)
		.filter(Boolean)
		.join(', ');
	const location = [affiliation.city, affiliation.region, affiliation.country]
		.map(normalizeAuthorText)
		.filter(Boolean)
		.join(', ');

	return [primary, location].filter(Boolean).join(', ');
}

export function normalizeAffiliationSnapshot(
	input: unknown,
	fallbackId?: string
): PaperAuthorAffiliationSnapshot | null {
	if (typeof input === 'string' || typeof input === 'number') {
		const organization = normalizeAuthorText(input);
		return organization
			? {
					id: fallbackId,
					organization,
					displayName: organization
				}
			: null;
	}

	const record = asRecord(input);
	if (!record) return null;

	const organization =
		normalizeAuthorText(record.organization) ||
		normalizeAuthorText(record.institution) ||
		normalizeAuthorText(record.affiliation) ||
		normalizeAuthorText(record.name);
	const department =
		normalizeAuthorText(record.department) ||
		normalizeAuthorText(record.departmentName) ||
		normalizeAuthorText(record['department-name']);
	const roleTitle =
		normalizeAuthorText(record.roleTitle) ||
		normalizeAuthorText(record.role) ||
		normalizeAuthorText(record.title) ||
		normalizeAuthorText(record.position) ||
		normalizeAuthorText(record['role-title']);
	const city = normalizeAuthorText(record.city);
	const region = normalizeAuthorText(record.region);
	const country = normalizeAuthorText(record.country);
	const rorId = normalizeRorId(record.rorId ?? record.ror ?? record['ror-id']);

	const structuredDisplayName = formatAffiliationDisplayName({
			organization,
			department,
			city,
			region,
			country
		});
	const displayName = structuredDisplayName || normalizeAuthorText(record.displayName);

	if (!organization && !department && !roleTitle && !city && !region && !country && !rorId && !displayName) {
		return null;
	}

	return {
		id: normalizeAuthorText(record.id) || fallbackId,
		organization,
		department,
		roleTitle,
		city,
		region,
		country,
		rorId,
		displayName
	};
}

export function normalizeAuthorSnapshot(input: unknown): PaperAuthorSnapshot | null {
	const record = asRecord(input);
	if (!record) return null;

	const userId = getAuthorReferenceId(record);
	const username = normalizeAuthorText(record.username);
	const email = normalizeAuthorText(record.email);
	const name = getAuthorNameFromRecord(record);
	if (!name && !username && !email) return null;

	const legacyDepartment =
		normalizeAuthorText(record.department) || normalizeAuthorText(record.position);
	const legacyAffiliation =
		normalizeAuthorText(record.affiliation) || normalizeAuthorText(record.institution);
	const rawAffiliations = Array.isArray(record.affiliations) ? record.affiliations : [];
	let affiliations = dedupeAffiliations(
		rawAffiliations
			.map((affiliation, index) => normalizeAffiliationSnapshot(affiliation, `affiliation-${index + 1}`))
			.filter((affiliation): affiliation is PaperAuthorAffiliationSnapshot => Boolean(affiliation))
	);

	if (affiliations.length === 0 && (legacyDepartment || legacyAffiliation)) {
		const legacySnapshot = normalizeAffiliationSnapshot(
			{
				id: 'legacy-affiliation',
				department: legacyDepartment,
				organization: legacyAffiliation,
				displayName: formatAffiliationDisplayName({
					department: legacyDepartment,
					organization: legacyAffiliation
				})
			},
			'legacy-affiliation'
		);
		if (legacySnapshot) affiliations = [legacySnapshot];
	}

	const firstAffiliation = affiliations[0];

	return {
		userId,
		username,
		name: name || username || email,
		email,
		orcid: normalizeAuthorText(record.orcid),
		isCorresponding: Boolean(record.isCorresponding),
		department: legacyDepartment || firstAffiliation?.department || '',
		affiliation: legacyAffiliation || firstAffiliation?.organization || firstAffiliation?.displayName || '',
		affiliations
	};
}

export function normalizeAuthorSnapshots(input: unknown): PaperAuthorSnapshot[] {
	if (!Array.isArray(input)) return [];

	return input
		.map((item) => normalizeAuthorSnapshot(item))
		.filter((item): item is PaperAuthorSnapshot => Boolean(item));
}

export function authorSnapshotMatchesReference(
	author: PaperAuthorSnapshot | null | undefined,
	reference: unknown
): boolean {
	if (!author || !reference) return false;

	const referenceId = getAuthorReferenceId(reference);
	const referenceRecord = asRecord(reference);
	const referenceUsername = referenceRecord
		? normalizeAuthorText(referenceRecord.username)
		: normalizeAuthorText(reference);

	return Boolean(
		(referenceId && referenceId === author.userId) ||
			(referenceUsername && referenceUsername === author.username) ||
			(referenceId && referenceId === author.username)
	);
}

export function markCorrespondingAuthor(
	authors: PaperAuthorSnapshot[],
	reference: unknown
): PaperAuthorSnapshot[] {
	return authors.map((author) => ({
		...author,
		isCorresponding: authorSnapshotMatchesReference(author, reference)
	}));
}

export function countCorrespondingAuthors(authors: PaperAuthorSnapshot[]): number {
	return authors.filter((author) => author.isCorresponding === true).length;
}

export function getMarkedCorrespondingAuthor(authors: PaperAuthorSnapshot[]): PaperAuthorSnapshot | null {
	return authors.find((author) => author.isCorresponding === true) ?? null;
}

export function validateCorrespondingAuthorSelection(
	authors: PaperAuthorSnapshot[],
	options: { requireOne?: boolean } = {}
) {
	const count = countCorrespondingAuthors(authors);
	if (count > 1) {
		return {
			ok: false,
			message: 'Only one author can be marked as corresponding author.'
		};
	}

	if (options.requireOne && count !== 1) {
		return {
			ok: false,
			message: 'Select exactly one corresponding author before submitting.'
		};
	}

	return {
		ok: true,
		message: ''
	};
}

export function affiliationDedupeKey(affiliation: PaperAuthorAffiliationSnapshot): string {
	const rorKey = normalizeRorId(affiliation.rorId);
	if (rorKey) return `ror:${normalizeIdentity(rorKey)}`;

	const organizationKey = normalizeIdentity(affiliation.organization);
	if (organizationKey) return `organization:${organizationKey}`;

	return `display:${normalizeIdentity(affiliation.displayName || formatAffiliationDisplayName(affiliation))}`;
}

export function buildPaperAffiliationIndex(authors: PaperAuthorSnapshot[]): PaperAffiliationIndex {
	const entries: IndexedPaperAffiliation[] = [];
	const indexByKey = new Map<string, number>();
	const authorAffiliationIndexes: number[][] = [];

	for (const author of authors) {
		const indexes: number[] = [];
		const seenForAuthor = new Set<string>();
		for (const affiliation of author.affiliations ?? []) {
			const displayName = affiliation.displayName || formatAffiliationDisplayName(affiliation);
			if (!displayName) continue;

			const key = affiliationDedupeKey(affiliation);
			if (seenForAuthor.has(key)) continue;
			seenForAuthor.add(key);

			let affiliationIndex = indexByKey.get(key);
			if (!affiliationIndex) {
				affiliationIndex = entries.length + 1;
				indexByKey.set(key, affiliationIndex);
				entries.push({
					index: affiliationIndex,
					key,
					displayName,
					affiliation
				});
			}

			indexes.push(affiliationIndex);
		}
		authorAffiliationIndexes.push(indexes);
	}

	return { entries, authorAffiliationIndexes };
}

export function toSuperscriptNumber(value: number): string {
	return String(value)
		.split('')
		.map((digit) => SUPERSCRIPT_DIGITS[digit] ?? digit)
		.join('');
}

export function formatAffiliationIndexes(indexes: number[]): string {
	return indexes.map(toSuperscriptNumber).join('');
}

function getOrcidSummary(wrapper: unknown): Record<string, unknown> | null {
	const record = asRecord(wrapper);
	if (!record) return null;

	for (const key of AFFILIATION_SUMMARY_KEYS) {
		const summary = getNestedRecord(record, key);
		if (summary) return summary;
	}

	return getNestedRecord(record, 'organization') ? record : null;
}

function getOrcidRorId(organization: Record<string, unknown> | null): string {
	const disambiguated = getNestedRecord(organization, 'disambiguated-organization');
	const source = normalizeIdentity(disambiguated?.['disambiguation-source']);
	const identifier = normalizeAuthorText(disambiguated?.['disambiguated-organization-identifier']);

	if (source === 'ror' || /ror\.org/i.test(identifier)) {
		return normalizeRorId(identifier);
	}

	return '';
}

function affiliationFromOrcidSummary(summary: Record<string, unknown>): PaperAuthorAffiliationSnapshot | null {
	const organization = getNestedRecord(summary, 'organization');
	const address = getNestedRecord(organization, 'address');
	const normalized = normalizeAffiliationSnapshot({
		id: normalizeAuthorText(summary['put-code']) || undefined,
		organization: getNestedText(organization, 'name'),
		department: normalizeAuthorText(summary['department-name']),
		roleTitle: normalizeAuthorText(summary['role-title']),
		city: getNestedText(address, 'city'),
		region: getNestedText(address, 'region'),
		country: getNestedText(address, 'country'),
		rorId: getOrcidRorId(organization)
	});

	return normalized;
}

export function extractOrcidAffiliations(profile: unknown): PaperAuthorAffiliationSnapshot[] {
	const record = asRecord(profile);
	const activities = getNestedRecord(record, 'activities-summary');
	if (!activities) return [];

	const affiliations: PaperAuthorAffiliationSnapshot[] = [];
	const seen = new Set<string>();

	for (const collectionKey of AFFILIATION_COLLECTION_KEYS) {
		const collection = getNestedRecord(activities, collectionKey);
		const groups = Array.isArray(collection?.['affiliation-group'])
			? (collection?.['affiliation-group'] as unknown[])
			: [];

		for (const group of groups) {
			const groupRecord = asRecord(group);
			const summaries = Array.isArray(groupRecord?.summaries)
				? (groupRecord?.summaries as unknown[])
				: [];

			for (const wrapper of summaries) {
				const summary = getOrcidSummary(wrapper);
				if (!summary) continue;

				const affiliation = affiliationFromOrcidSummary(summary);
				if (!affiliation) continue;

				const key = affiliationDedupeKey(affiliation);
				if (seen.has(key)) continue;
				seen.add(key);
				affiliations.push(affiliation);
			}
		}
	}

	return affiliations;
}

/**
 * An author may carry at most this many affiliations. Enforced in the UI, which stops
 * offering the "add" control, and again in both save endpoints, because a client can
 * post whatever it likes regardless of what the form allowed.
 */
export const MAX_AFFILIATIONS_PER_AUTHOR = 3;

/**
 * Collapses repeats of the same institution for one author, keeping the first occurrence.
 * `affiliationDedupeKey` is the project's existing notion of "same affiliation" (ROR id,
 * else organization, else display name), so this agrees with how `buildPaperAffiliationIndex`
 * already numbers them for display.
 */
export function dedupeAffiliations(
	affiliations: PaperAuthorAffiliationSnapshot[]
): PaperAuthorAffiliationSnapshot[] {
	const seen = new Set<string>();
	const result: PaperAuthorAffiliationSnapshot[] = [];

	for (const affiliation of affiliations ?? []) {
		if (!affiliation) continue;
		const key = affiliationDedupeKey(affiliation);
		if (!key || key === 'display:' || seen.has(key)) continue;
		seen.add(key);
		result.push(affiliation);
	}

	return result;
}

export interface AuthorAffiliationLimitResult {
	ok: boolean;
	message: string;
	authorName?: string;
	count?: number;
}

/**
 * The limit is per author, not per paper: a paper with five authors may legitimately carry
 * fifteen affiliations. Counting runs over deduped entries, so repeating one institution is
 * ignored rather than consuming a slot.
 */
export function validateAuthorAffiliationLimits(
	authors: PaperAuthorSnapshot[]
): AuthorAffiliationLimitResult {
	for (const author of authors ?? []) {
		const count = dedupeAffiliations(author?.affiliations ?? []).length;
		if (count > MAX_AFFILIATIONS_PER_AUTHOR) {
			return {
				ok: false,
				message: `${author?.name || 'An author'} has ${count} affiliations. Each author can have at most ${MAX_AFFILIATIONS_PER_AUTHOR}.`,
				authorName: author?.name,
				count
			};
		}
	}

	return { ok: true, message: '' };
}

export interface ReusableAffiliation {
	key: string;
	displayName: string;
	affiliation: PaperAuthorAffiliationSnapshot;
}

/**
 * Builds the "affiliations already known for these people" list offered for reuse, so the
 * same institution never has to be typed twice.
 *
 * This deliberately does not create a global directory of institutions. The sources are only
 * what already belongs to the people involved: the authors on this paper, the same author's
 * snapshots on their earlier papers, their ORCID record and their profile. Nothing here writes
 * to a user profile, and nothing leaks between users who are not already on the paper.
 */
export function collectReusableAffiliations(
	sources: Array<PaperAuthorAffiliationSnapshot | null | undefined>
): ReusableAffiliation[] {
	const seen = new Set<string>();
	const result: ReusableAffiliation[] = [];

	for (const raw of sources ?? []) {
		const affiliation = raw ? normalizeAffiliationSnapshot(raw) : null;
		if (!affiliation) continue;

		const displayName = affiliation.displayName || formatAffiliationDisplayName(affiliation);
		if (!displayName) continue;

		const key = affiliationDedupeKey(affiliation);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push({ key, displayName, affiliation });
	}

	return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Whether `candidate` is already among `existing` for the same author. The UI uses this to
 * disable an entry in the reuse list, so the client applies the same rule the server does.
 */
export function hasAffiliation(
	existing: PaperAuthorAffiliationSnapshot[],
	candidate: PaperAuthorAffiliationSnapshot
): boolean {
	const key = affiliationDedupeKey(candidate);
	return (existing ?? []).some((affiliation) => affiliationDedupeKey(affiliation) === key);
}
