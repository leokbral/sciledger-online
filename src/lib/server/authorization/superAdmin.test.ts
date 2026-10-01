import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_GLOBAL_ROLES,
	PERMISSIONS,
	SUPER_ADMIN_PERMISSION,
	SUPER_ADMIN_ROLE_KEY,
	permissionRequiresResource
} from './permissions';

const mocks = vi.hoisted(() => ({
	authorize: vi.fn()
}));

vi.mock('./authorizationService', () => ({
	authorize: mocks.authorize,
	can: vi.fn()
}));

function allow() {
	mocks.authorize.mockResolvedValue({ allowed: true, permission: SUPER_ADMIN_PERMISSION });
}

function deny(reason = 'no_role_assignment') {
	mocks.authorize.mockResolvedValue({ allowed: false, permission: SUPER_ADMIN_PERMISSION, reason });
}

describe('super admin role modelling', () => {
	it('keeps platform.superAdmin out of PERMISSIONS so the RBAC screen cannot grant it', () => {
		expect(PERMISSIONS).not.toContain(SUPER_ADMIN_PERMISSION);
	});

	it('does not give the existing Admin role platform.superAdmin', () => {
		const admin = DEFAULT_GLOBAL_ROLES.find((role) => role.key === 'Admin');

		expect(admin).toBeDefined();
		expect(admin?.permissions).not.toContain(SUPER_ADMIN_PERMISSION);
	});

	it('defines a protected system role that carries only platform.superAdmin', () => {
		const role = DEFAULT_GLOBAL_ROLES.find((entry) => entry.key === SUPER_ADMIN_ROLE_KEY);

		expect(role).toBeDefined();
		expect(role?.permissions).toEqual([SUPER_ADMIN_PERMISSION]);
		expect(role?.isSystem).toBe(true);
		expect(role?.isProtected).toBe(true);
	});

	it('treats platform.superAdmin as a permission that needs no paper or hub context', () => {
		expect(permissionRequiresResource(SUPER_ADMIN_PERMISSION)).toBe(false);
	});
});

describe('isSuperAdmin', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns false without consulting authorization when there is no user', async () => {
		const { isSuperAdmin } = await import('./superAdmin');

		expect(await isSuperAdmin(null)).toBe(false);
		expect(mocks.authorize).not.toHaveBeenCalled();
	});

	it('asks authorize() for platform.superAdmin with no resource context', async () => {
		allow();
		const { isSuperAdmin } = await import('./superAdmin');

		expect(await isSuperAdmin({ id: 'user-1' })).toBe(true);
		expect(mocks.authorize).toHaveBeenCalledWith(
			{ id: 'user-1' },
			SUPER_ADMIN_PERMISSION,
			null,
			{}
		);
	});

	it('returns false when the user holds no super admin assignment', async () => {
		deny();
		const { isSuperAdmin } = await import('./superAdmin');

		expect(await isSuperAdmin({ id: 'user-2' })).toBe(false);
	});
});

describe('requireSuperAdmin', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('throws 401 for an unauthenticated request', async () => {
		const { requireSuperAdmin } = await import('./superAdmin');

		await expect(requireSuperAdmin(undefined)).rejects.toMatchObject({ status: 401 });
		expect(mocks.authorize).not.toHaveBeenCalled();
	});

	it('throws 403 for an authenticated user without platform.superAdmin', async () => {
		deny('permission_not_granted');
		const { requireSuperAdmin } = await import('./superAdmin');

		await expect(requireSuperAdmin({ id: 'regular-user' })).rejects.toMatchObject({ status: 403 });
	});

	it('resolves with the user when platform.superAdmin is held', async () => {
		allow();
		const { requireSuperAdmin } = await import('./superAdmin');
		const user = { id: 'super-user', email: 'super@example.com' };

		await expect(requireSuperAdmin(user)).resolves.toBe(user);
	});

	it('is not satisfied by the legacy user.roles.admin boolean', async () => {
		deny();
		const { requireSuperAdmin } = await import('./superAdmin');

		await expect(
			requireSuperAdmin({ id: 'legacy-admin', roles: { admin: true } })
		).rejects.toMatchObject({ status: 403 });
	});

	it('is not satisfied by a client-supplied role claim', async () => {
		deny();
		const { requireSuperAdmin } = await import('./superAdmin');

		await expect(
			requireSuperAdmin({ id: 'spoofer', globalRole: 'super_admin', isSuperAdmin: true })
		).rejects.toMatchObject({ status: 403 });
	});
});
