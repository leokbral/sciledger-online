import { readPagination } from '$lib/server/admin/pagination';
import { listHubs } from '$lib/server/admin/queries';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireSuperAdmin(locals.user);

	const pagination = readPagination(url.searchParams);
	const hubs = await listHubs(pagination);

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.hub.view',
		resourceType: 'hub',
		resourceId: 'list',
		metadata: {
			search: pagination.search || null,
			page: pagination.page,
			returned: hubs.items.length
		}
	});

	return { hubs };
};
