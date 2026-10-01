import { start_mongo } from '$lib/db/mongooseConnection';
import { requireSuperAdmin } from '$lib/server/authorization/superAdmin';
import type { LayoutServerLoad } from './$types';

/**
 * Guard for the whole platform administration area.
 *
 * This lives in the `(platform)` layout group rather than directly under `/admin`
 * on purpose: `/admin/rbac` already exists and is gated on `rbac.manage`. Putting
 * a super-admin guard on `admin/+layout.server.ts` would silently revoke that page
 * from every existing Admin. The group keeps the URLs (`/admin`, `/admin/users`, ...)
 * while leaving `/admin/rbac` untouched.
 *
 * `requireSuperAdmin` throws 401 or 403, so no child load function can render
 * before authorization has passed.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	await start_mongo();
	await requireSuperAdmin(locals.user);

	return {
		superAdmin: true
	};
};
