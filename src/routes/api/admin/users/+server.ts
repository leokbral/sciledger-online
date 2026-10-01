import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { listUsers } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.user.view',
		resourceType: 'user',
		load: (pagination) => listUsers(pagination)
	});
