import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { listHubs } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.hub.view',
		resourceType: 'hub',
		load: (pagination) => listHubs(pagination)
	});
