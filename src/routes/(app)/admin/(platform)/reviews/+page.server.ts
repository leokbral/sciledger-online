import { readPagination } from '$lib/server/admin/pagination';
import { listReviews, REVIEW_ASSIGNMENT_STATUSES } from '$lib/server/admin/queries';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireSuperAdmin(locals.user);

	const pagination = readPagination(url.searchParams);
	const requestedStatus = String(url.searchParams.get('status') ?? '').trim();
	const status = (REVIEW_ASSIGNMENT_STATUSES as readonly string[]).includes(requestedStatus)
		? requestedStatus
		: '';

	const reviews = await listReviews(pagination, { status: status || undefined });

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.review.view',
		resourceType: 'review',
		resourceId: 'list',
		metadata: {
			search: pagination.search || null,
			status: status || null,
			page: pagination.page,
			returned: reviews.items.length
		}
	});

	return { reviews, statuses: REVIEW_ASSIGNMENT_STATUSES, status };
};
