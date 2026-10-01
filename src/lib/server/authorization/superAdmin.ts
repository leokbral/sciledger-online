import { error } from '@sveltejs/kit';
import type mongoose from 'mongoose';
import { authorize } from './authorizationService';
import { SUPER_ADMIN_PERMISSION, SUPER_ADMIN_ROLE_KEY } from './permissions';

export { SUPER_ADMIN_PERMISSION, SUPER_ADMIN_ROLE_KEY };

type SuperAdminOptions = {
	session?: mongoose.ClientSession | null;
};

/**
 * Platform-level authorization gate.
 *
 * `super_admin` is modelled as the global role `SuperAdmin` carrying the
 * `platform.superAdmin` permission, assigned through the existing
 * `UserRoleAssignment` collection with `scopeType: 'global'`. It is an additional
 * layer on top of RBAC: it never replaces hub roles and never removes them.
 *
 * Every decision goes through `authorize()`, the single authorization entry point
 * already used by the rest of the codebase. There is no parallel check, no reliance
 * on the legacy `user.roles.admin` boolean, and nothing is read from the client.
 */
export async function isSuperAdmin(user: any, options: SuperAdminOptions = {}) {
	if (!user) {
		return false;
	}

	const result = await authorize(user, SUPER_ADMIN_PERMISSION, null, options);
	return result.allowed;
}

/**
 * Server-side guard for platform administration pages and endpoints.
 *
 * Throws 401 when there is no authenticated session and 403 when the
 * authenticated user does not hold `platform.superAdmin`. Callers must await it
 * before reading any data.
 */
export async function requireSuperAdmin(user: any, options: SuperAdminOptions = {}) {
	if (!user) {
		throw error(401, 'Authentication required');
	}

	if (!(await isSuperAdmin(user, options))) {
		throw error(403, 'Super administrator access required');
	}

	return user;
}
