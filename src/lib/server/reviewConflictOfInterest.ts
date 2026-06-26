export const REVIEW_CONFLICT_OF_INTEREST_MESSAGE =
	'You cannot review a paper you authored.';

type AnyRecord = Record<string, any>;

function normalizeAlias(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const alias = String(value).trim();
	return alias && alias !== '[object Object]' ? alias : null;
}

export function getIdentityAliases(value: unknown): string[] {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') {
		const alias = normalizeAlias(value);
		return alias ? [alias] : [];
	}
	if (value instanceof Date || typeof value !== 'object') return [];

	const candidate = value as AnyRecord;
	const aliases = [
		...getIdentityAliases(candidate.id),
		...getIdentityAliases(candidate._id),
		...getIdentityAliases(candidate.userId)
	];

	const stringified = candidate.toString?.();
	const stringifiedAlias = normalizeAlias(stringified);
	if (stringifiedAlias) aliases.push(stringifiedAlias);

	return [...new Set(aliases)];
}

export function getPaperAuthorAliases(paper: AnyRecord | null | undefined): string[] {
	if (!paper) return [];

	const authorAffiliationUserIds = Array.isArray(paper.authorAffiliations)
		? paper.authorAffiliations.map((affiliation: AnyRecord) => affiliation?.userId)
		: [];

	const authorValues = [
		paper.mainAuthor,
		paper.correspondingAuthor,
		paper.submittedBy,
		...(Array.isArray(paper.coAuthors) ? paper.coAuthors : []),
		...(Array.isArray(paper.authors) ? paper.authors : []),
		...authorAffiliationUserIds
	];

	return [...new Set(authorValues.flatMap((author) => getIdentityAliases(author)))];
}

export function hasReviewConflictOfInterest(
	paper: AnyRecord | null | undefined,
	reviewer: unknown
) {
	const reviewerAliases = new Set(getIdentityAliases(reviewer));
	if (reviewerAliases.size === 0) return false;

	return getPaperAuthorAliases(paper).some((authorAlias) => reviewerAliases.has(authorAlias));
}

export function validateReviewerCanReviewPaper(
	paper: AnyRecord | null | undefined,
	reviewer: unknown
) {
	const hasConflict = hasReviewConflictOfInterest(paper, reviewer);

	return {
		allowed: !hasConflict,
		error: hasConflict ? REVIEW_CONFLICT_OF_INTEREST_MESSAGE : null
	};
}
