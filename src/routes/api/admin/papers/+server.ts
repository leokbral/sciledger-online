import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { listPapers, PAPER_STATUS_FILTERS } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

/** Only a known status reaches the query; anything else is ignored. */
function readStatus(url: URL) {
	const requested = String(url.searchParams.get('status') ?? '').trim();
	return (PAPER_STATUS_FILTERS as readonly string[]).includes(requested) ? requested : undefined;
}

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.paper.view',
		resourceType: 'paper',
		load: (pagination, url) =>
			listPapers(pagination, {
				status: readStatus(url),
				hubId: String(url.searchParams.get('hubId') ?? '').trim() || undefined
			}),
		auditMetadata: (url) => ({
			status: readStatus(url) ?? null,
			hubId: String(url.searchParams.get('hubId') ?? '').trim() || null
		})
	});
