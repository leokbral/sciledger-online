import { getDashboardMetrics } from '$lib/server/admin/queries';
import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// The group layout already guards this subtree; repeating the check here keeps
	// the page unreadable on its own terms rather than relying on a parent.
	await requireSuperAdmin(locals.user);

	const metrics = await getDashboardMetrics();

	await recordAdminAuditEvent({
		actor: locals.user,
		action: 'admin.dashboard.view',
		resourceType: 'platform',
		resourceId: 'dashboard'
	});

	return metrics;
};
