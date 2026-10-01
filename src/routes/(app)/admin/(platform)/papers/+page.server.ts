import { readPagination } from '$lib/server/admin/pagination';
import { listPapers, PAPER_STATUS_FILTERS } from '$lib/server/admin/queries';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireSuperAdmin(locals.user);

	const pagination = readPagination(url.searchParams);
	const requestedStatus = String(url.searchParams.get('status') ?? '').trim();
	// Only a known status reaches the query, so the filter cannot be used to inject
	// an arbitrary expression.
	const status = (PAPER_STATUS_FILTERS as readonly string[]).includes(requestedStatus)
		? requestedStatus
		: '';
	const hubId = String(url.searchParams.get('hubId') ?? '').trim();

	const papers = await listPapers(pagination, {
		status: status || undefined,
		hubId: hubId || undefined
	});

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.paper.view',
		resourceType: 'paper',
		resourceId: 'list',
		metadata: {
			search: pagination.search || null,
			status: status || null,
			hubId: hubId || null,
			page: pagination.page,
			returned: papers.items.length
		}
	});

	return { papers, statuses: PAPER_STATUS_FILTERS, status, hubId };
};
