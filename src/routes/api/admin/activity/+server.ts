import { respondWithAdminList } from '$lib/server/admin/apiResponse';
import { listActivity } from '$lib/server/admin/queries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) =>
	respondWithAdminList(event, {
		action: 'admin.activity.view',
		resourceType: 'activity',
		load: (pagination, url) =>
			listActivity(pagination, { adminOnly: url.searchParams.get('scope') !== 'all' }),
		auditMetadata: (url) => ({ scope: url.searchParams.get('scope') === 'all' ? 'all' : 'admin' })
	});
