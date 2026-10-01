import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPER_ADMIN_ROLE_KEY } from '$lib/server/authorization/permissions';

/**
 * Regression tests for a privilege-escalation path.
 *
 * This screen is gated on `rbac.manage`, which the existing `Admin` role holds. It
 * can edit a global role's permissions, assign a global role to any account and
 * revoke an assignment. If the SuperAdmin role were reachable from here, an Admin
 * could grant themselves platform super administration, or strip the permission off
 * the role and lock every super administrator out.
 *
 * `rbac.manage` is granted throughout, so these tests prove the refusal comes from
 * the role guard and not from a missing permission.
 */
const mocks = vi.hoisted(() => ({
	authorize: vi.fn(),
	ensureDefaultRoles: vi.fn().mockResolvedValue(undefined),
	emitEvent: vi.fn().mockResolvedValue(undefined),
	roleFind: vi.fn(),
	roleFindOne: vi.fn(),
	roleUpdateOne: vi.fn(),
	assignmentFind: vi.fn(),
	assignmentFindOne: vi.fn(),
	assignmentUpdateOne: vi.fn(),
	userFind: vi.fn(),
	userFindOne: vi.fn(),
	hubFind: vi.fn(),
	auditFind: vi.fn()
}));

function leanArray(rows: any[] = []) {
	const query: any = {
		select: () => query,
		sort: () => query,
		skip: () => query,
		limit: () => query,
		session: () => query,
		lean: async () => rows,
		exec: async () => rows
	};
	return query;
}

function leanOne(row: any = null) {
	const query: any = {
		select: () => query,
		sort: () => query,
		session: () => query,
		lean: async () => row,
		exec: async () => row
	};
	return query;
}

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/server/authorization/authorizationService', () => ({
	authorize: mocks.authorize,
	can: vi.fn()
}));

vi.mock('$lib/server/authorization/bootstrapRbac', () => ({
	ensureDefaultRoles: mocks.ensureDefaultRoles
}));

vi.mock('$lib/services/EventService', () => ({ emitEvent: mocks.emitEvent }));

vi.mock('$lib/db/models/Role', () => ({
	default: {
		find: (...args: any[]) => mocks.roleFind(...args),
		findOne: (...args: any[]) => mocks.roleFindOne(...args),
		updateOne: (...args: any[]) => mocks.roleUpdateOne(...args)
	}
}));

vi.mock('$lib/db/models/UserRoleAssignment', () => ({
	default: {
		find: (...args: any[]) => mocks.assignmentFind(...args),
		findOne: (...args: any[]) => mocks.assignmentFindOne(...args),
		updateOne: (...args: any[]) => mocks.assignmentUpdateOne(...args)
	}
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		find: (...args: any[]) => mocks.userFind(...args),
		findOne: (...args: any[]) => mocks.userFindOne(...args)
	}
}));

vi.mock('$lib/db/models/Hub', () => ({
	default: { find: (...args: any[]) => mocks.hubFind(...args) }
}));

vi.mock('$lib/db/models/EditorialAuditLog', () => ({
	default: { find: (...args: any[]) => mocks.auditFind(...args) }
}));

const RBAC_MANAGER = { id: 'admin-user', email: 'admin@example.com' };

function formEvent(fields: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		formData.set(key, value);
	}

	return {
		request: { formData: async () => formData },
		locals: { user: RBAC_MANAGER }
	} as any;
}

beforeEach(() => {
	vi.clearAllMocks();
	// rbac.manage is granted for every test in this file.
	mocks.authorize.mockResolvedValue({ allowed: true, permission: 'rbac.manage' });
	mocks.ensureDefaultRoles.mockResolvedValue(undefined);
	mocks.emitEvent.mockResolvedValue(undefined);
	mocks.roleFind.mockReturnValue(leanArray([]));
	mocks.roleFindOne.mockReturnValue(leanOne(null));
	mocks.roleUpdateOne.mockResolvedValue({ modifiedCount: 0 });
	mocks.assignmentFind.mockReturnValue(leanArray([]));
	mocks.assignmentFindOne.mockReturnValue(leanOne(null));
	mocks.assignmentUpdateOne.mockResolvedValue({ modifiedCount: 0 });
	mocks.userFind.mockReturnValue(leanArray([]));
	mocks.userFindOne.mockReturnValue(leanOne(null));
	mocks.hubFind.mockReturnValue(leanArray([]));
	mocks.auditFind.mockReturnValue(leanArray([]));
});

describe('the SuperAdmin role is not reachable from the RBAC screen', () => {
	it('refuses to assign it to anyone, including the caller', async () => {
		const { actions } = await import('./+page.server');

		const result: any = await actions.assignRole(
			formEvent({ userId: RBAC_MANAGER.id, roleKey: SUPER_ADMIN_ROLE_KEY })
		);

		expect(result.status).toBe(403);
		expect(mocks.assignmentUpdateOne).not.toHaveBeenCalled();
	});

	it('refuses to rewrite its permissions, which would lock super administrators out', async () => {
		const { actions } = await import('./+page.server');

		const result: any = await actions.updateRolePermissions(
			formEvent({ roleKey: SUPER_ADMIN_ROLE_KEY })
		);

		expect(result.status).toBe(403);
		expect(mocks.roleUpdateOne).not.toHaveBeenCalled();
	});

	it('refuses to create a role under the same key', async () => {
		const { actions } = await import('./+page.server');

		const result: any = await actions.createRole(
			formEvent({ key: SUPER_ADMIN_ROLE_KEY, name: 'Super Administrator' })
		);

		expect(result.status).toBe(403);
		expect(mocks.roleUpdateOne).not.toHaveBeenCalled();
	});

	it('refuses to revoke an existing super administrator assignment', async () => {
		mocks.assignmentFindOne.mockReturnValue(
			leanOne({
				_id: 'assignment-1',
				id: 'assignment-1',
				userId: 'super-user',
				roleKey: SUPER_ADMIN_ROLE_KEY,
				scopeType: 'global',
				isActive: true
			})
		);
		const { actions } = await import('./+page.server');

		const result: any = await actions.revokeAssignment(formEvent({ assignmentId: 'assignment-1' }));

		expect(result.status).toBe(403);
		expect(mocks.assignmentUpdateOne).not.toHaveBeenCalled();
	});

	it('hides it from the role and assignment listings', async () => {
		const { load } = await import('./+page.server');

		await load({ locals: { user: RBAC_MANAGER } } as any);

		expect(mocks.roleFind).toHaveBeenCalledWith(
			expect.objectContaining({ key: { $ne: SUPER_ADMIN_ROLE_KEY } })
		);
		expect(mocks.assignmentFind).toHaveBeenCalledWith(
			expect.objectContaining({ roleKey: { $ne: SUPER_ADMIN_ROLE_KEY } })
		);
	});
});

describe('ordinary role management still works', () => {
	it('assigns a normal global role', async () => {
		// `assignRole` awaits Role.findOne(...) directly, without .lean().
		mocks.roleFindOne.mockResolvedValue({ key: 'Support', name: 'Support' });
		const { actions } = await import('./+page.server');

		const result: any = await actions.assignRole(
			formEvent({ userId: 'target-user', roleKey: 'Support' })
		);

		expect(result).toEqual({ success: true });
		expect(mocks.assignmentUpdateOne).toHaveBeenCalled();
	});

	it('updates permissions on a normal role', async () => {
		mocks.roleUpdateOne.mockResolvedValue({ modifiedCount: 1 });
		const { actions } = await import('./+page.server');

		const result: any = await actions.updateRolePermissions(
			formEvent({ roleKey: 'Support', permissions: 'hub.manageMembers' })
		);

		expect(result).toEqual({ success: true });
		expect(mocks.roleUpdateOne).toHaveBeenCalled();
	});

	it('still refuses a caller without rbac.manage', async () => {
		mocks.authorize.mockResolvedValue({ allowed: false, permission: 'rbac.manage' });
		const { actions } = await import('./+page.server');

		const result: any = await actions.assignRole(
			formEvent({ userId: 'target-user', roleKey: 'Support' })
		);

		expect(result.status).toBe(403);
		expect(mocks.assignmentUpdateOne).not.toHaveBeenCalled();
	});
});
