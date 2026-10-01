import { INVITATION_STATUSES, listInvitations } from '$lib/server/admin/queries';
import { readPagination } from '$lib/server/admin/pagination';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireSuperAdmin(locals.user);

	const pagination = readPagination(url.searchParams);
	const requestedStatus = String(url.searchParams.get('status') ?? '').trim();
	const status = (INVITATION_STATUSES as readonly string[]).includes(requestedStatus)
		? requestedStatus
		: '';

	const invitations = await listInvitations(pagination, { status: status || undefined });

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.invitation.view',
		resourceType: 'invitation',
		resourceId: 'list',
		metadata: {
			search: pagination.search || null,
			status: status || null,
			page: pagination.page,
			returned: invitations.items.length
		}
	});

	return { invitations, statuses: INVITATION_STATUSES, status };
};
