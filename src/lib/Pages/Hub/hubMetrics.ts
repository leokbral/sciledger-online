import type { HubMetrics, HubSummary } from './hubTypes';

export function countPapersByStatus(papers: Record<string, any>[], statuses: string[]) {
	const normalizedStatuses = new Set(statuses.map((status) => status.toLowerCase()));

	return papers.filter((paper) => normalizedStatuses.has(String(paper?.status ?? '').toLowerCase()))
		.length;
}

// Status vocabulary buckets used to derive Hub-level editorial metrics.
const STATUS = {
	draft: ['draft'],
	reviewerAssignment: ['reviewer assignment'],
	inReview: ['in review', 'under final review'],
	corrections: ['needing corrections', 'needs corrections', 'under correction'],
	accepted: ['accepted', 'completed'],
	published: ['published', 'released'],
	rejected: ['rejected', 'declined']
};

export function getHubMetrics(
	hubs: HubSummary[],
	papers: Record<string, any>[],
	reviews: Record<string, any>[]
): HubMetrics {
	const total = papers.length;
	const drafts = countPapersByStatus(papers, STATUS.draft);
	const underReview = countPapersByStatus(papers, [...STATUS.reviewerAssignment, ...STATUS.inReview]);
	const corrections = countPapersByStatus(papers, STATUS.corrections);
	const accepted = countPapersByStatus(papers, STATUS.accepted);
	const published = countPapersByStatus(papers, STATUS.published);
	const rejected = countPapersByStatus(papers, STATUS.rejected);

	// Manuscripts currently live in the editorial pipeline (not drafts, not finished).
	const active = Math.max(0, total - drafts - published - rejected);
	// Manuscripts awaiting an editorial action.
	const pending = underReview + corrections;
	// Acceptance rate over decided manuscripts only; null when nothing has been decided yet.
	const decided = accepted + published + rejected;
	const acceptanceRate = decided > 0 ? Math.round(((accepted + published) / decided) * 100) : null;

	return {
		hubs: hubs.length,
		papers: total,
		total,
		drafts,
		// Kept for backward compatibility with any existing consumers.
		inReview: countPapersByStatus(papers, ['in review', 'reviewer assignment']),
		underReview,
		active,
		corrections,
		pending,
		accepted,
		rejected,
		published,
		reviews: reviews.length,
		acceptanceRate
	};
}

export function hubId(hub: HubSummary | null | undefined) {
	return hub?.id ?? hub?._id ?? '';
}

export function hubHref(hub: HubSummary | null | undefined) {
	const id = hubId(hub);
	return id ? `/hub/view/${id}` : '/hub';
}

export function hubImageUrl(value: string | undefined) {
	if (!value) return '';
	if (/^(https?:\/\/|data:|blob:|\/api\/images\/)/i.test(value)) return value;
	return `/api/images/${value}`;
}
