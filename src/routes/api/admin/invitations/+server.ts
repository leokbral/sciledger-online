import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { INVITATION_STATUSES, listInvitations } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

function readStatus(url: URL) {
	const requested = String(url.searchParams.get('status') ?? '').trim();
	return (INVITATION_STATUSES as readonly string[]).includes(requested) ? requested : undefined;
}

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.invitation.view',
		resourceType: 'invitation',
		load: (pagination, url) => listInvitations(pagination, { status: readStatus(url) }),
		auditMetadata: (url) => ({ status: readStatus(url) ?? null })
	});
