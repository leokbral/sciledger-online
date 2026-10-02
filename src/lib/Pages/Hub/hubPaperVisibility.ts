import type { HubWorkspacePaper, HubWorkspacePersonaKey } from './hubTypes';

type ReviewResponse = {
	status?: unknown;
	reviewerId?: unknown;
	reviewer?: unknown;
};

const DECLINED_STATUSES = new Set(['rejected', 'declined']);
const ACTIVE_REVIEW_RESPONSE_STATUSES = new Set(['accepted', 'completed']);

export function getIdAliases(value: unknown): string[] {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') return [String(value)];
	if (typeof value !== 'object') return [];

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};
	const aliases = [candidate.id, candidate._id].filter(Boolean).map((alias) => String(alias));
	const stringified = candidate.toString?.();

	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases.filter(Boolean)));
}

export function toUserAliases(userId: unknown): Set<string> {
	return new Set(getIdAliases(userId));
}

function matchesUser(value: unknown, userAliases: Set<string>): boolean {
	if (userAliases.size === 0) return false;
	return getIdAliases(value).some((alias) => userAliases.has(alias));
}

function normalizedStatus(value: unknown): string {
	return String(value ?? '')
		.trim()
		.toLowerCase();
}

function reviewResponsesForUser(
	paper: HubWorkspacePaper,
	userAliases: Set<string>
): ReviewResponse[] {
	const responses = Array.isArray(paper.peer_review?.responses) ? paper.peer_review.responses : [];
	return responses.filter((response: unknown) => {
		const reviewResponse = (response ?? {}) as ReviewResponse;
		return matchesUser(reviewResponse.reviewerId ?? reviewResponse.reviewer, userAliases);
	}) as ReviewResponse[];
}

/**
 * A paper declined by the Hub keeps its previous workflow status and only gets
 * `rejectedByHub: true`, so both signals have to be checked.
 */
export function isPaperDeclined(paper: HubWorkspacePaper): boolean {
	return paper.rejectedByHub === true || DECLINED_STATUSES.has(normalizedStatus(paper.status));
}

export function isPaperDraft(paper: HubWorkspacePaper): boolean {
	return normalizedStatus(paper.status) === 'draft';
}

export function isPaperPublished(paper: HubWorkspacePaper): boolean {
	return normalizedStatus(paper.status) === 'published';
}

/** Main author, corresponding author, submitter or co-author. */
export function paperBelongsToUser(paper: HubWorkspacePaper, userAliases: Set<string>): boolean {
	return (
		matchesUser(paper.mainAuthor, userAliases) ||
		matchesUser(paper.correspondingAuthor, userAliases) ||
		matchesUser(paper.submittedBy, userAliases) ||
		(Array.isArray(paper.coAuthors) &&
			paper.coAuthors.some((coAuthor: unknown) => matchesUser(coAuthor, userAliases)))
	);
}

/**
 * The user is assigned to review the paper: listed in `reviewers`, accepted/completed a
 * review response, or listed in `assignedReviewers` without having declined the invitation.
 */
export function paperHasReviewerForUser(
	paper: HubWorkspacePaper,
	userAliases: Set<string>
): boolean {
	if (userAliases.size === 0) return false;

	const responses = reviewResponsesForUser(paper, userAliases);
	const declinedByReviewer = responses.some(
		(response) => normalizedStatus(response.status) === 'declined'
	);
	const acceptedResponse = responses.some((response) =>
		ACTIVE_REVIEW_RESPONSE_STATUSES.has(normalizedStatus(response.status))
	);

	const directReviewer =
		Array.isArray(paper.reviewers) &&
		paper.reviewers.some((reviewer: unknown) => matchesUser(reviewer, userAliases));

	const assignedReviewer =
		!declinedByReviewer &&
		Array.isArray(paper.peer_review?.assignedReviewers) &&
		paper.peer_review.assignedReviewers.some((reviewer: unknown) =>
			matchesUser(reviewer, userAliases)
		);

	return (
		Boolean(paper.isAcceptedForReview) || directReviewer || acceptedResponse || assignedReviewer
	);
}

/** Papers that belong in the user's review queue: assigned, not a draft, not declined by the Hub. */
export function isPaperReviewableByUser(
	paper: HubWorkspacePaper,
	userAliases: Set<string>
): boolean {
	return (
		!isPaperDraft(paper) && !isPaperDeclined(paper) && paperHasReviewerForUser(paper, userAliases)
	);
}

/**
 * Papers shown by each Hub workspace persona. The server already limits the list to what
 * the user may see; this narrows it to the role the user selected in the workspace switcher.
 */
export function filterPapersForPersona(
	papers: HubWorkspacePaper[],
	personaKey: HubWorkspacePersonaKey | null | undefined,
	userId: unknown
): HubWorkspacePaper[] {
	const list = Array.isArray(papers) ? papers : [];
	const userAliases = toUserAliases(userId);

	switch (personaKey) {
		case 'HubOwner':
		case 'EditorChief':
		case 'AssociateEditor':
			return list;
		case 'Reviewer':
			return list.filter((paper) => isPaperReviewableByUser(paper, userAliases));
		case 'Author':
			return list.filter((paper) => paperBelongsToUser(paper, userAliases));
		default:
			return list.filter(isPaperPublished);
	}
}
