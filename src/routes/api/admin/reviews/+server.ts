import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { listReviews, REVIEW_ASSIGNMENT_STATUSES } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

function readStatus(url: URL) {
	const requested = String(url.searchParams.get('status') ?? '').trim();
	return (REVIEW_ASSIGNMENT_STATUSES as readonly string[]).includes(requested)
		? requested
		: undefined;
}

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.review.view',
		resourceType: 'review',
		load: (pagination, url) => listReviews(pagination, { status: readStatus(url) }),
		auditMetadata: (url) => ({ status: readStatus(url) ?? null })
	});
