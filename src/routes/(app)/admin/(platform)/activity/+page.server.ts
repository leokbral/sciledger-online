import { listActivity } from '$lib/server/admin/queries';
import { readPagination } from '$lib/server/admin/pagination';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireSuperAdmin(locals.user);

	const pagination = readPagination(url.searchParams);
	// `scope=all` widens the feed from administrative events to every activity event.
	const adminOnly = url.searchParams.get('scope') !== 'all';

	const activity = await listActivity(pagination, { adminOnly });

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.activity.view',
		resourceType: 'activity',
		resourceId: 'list',
		metadata: {
			search: pagination.search || null,
			scope: adminOnly ? 'admin' : 'all',
			page: pagination.page,
			returned: activity.items.length
		}
	});

	return { activity, adminOnly };
};
