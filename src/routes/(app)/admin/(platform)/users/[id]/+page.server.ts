import { error } from '@sveltejs/kit';
import { getUserDetail } from '$lib/server/admin/queries';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	await requireSuperAdmin(locals.user);

	const profile = await getUserDetail(params.id);

	if (!profile) {
		await recordAdminAuditEvent({
			actor: locals.user,
			action: 'admin.user.view',
			resourceType: 'user',
			resourceId: params.id,
			result: 'denied',
			metadata: { reason: 'not_found' }
		});

		throw error(404, 'User not found');
	}

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.user.view',
		resourceType: 'user',
		resourceId: profile.id
	});

	return { profile };
};
