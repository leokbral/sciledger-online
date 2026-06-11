import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import EditorialAuditLog from '$lib/db/models/EditorialAuditLog';
import Users from '$lib/db/models/User';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { authorize } from '$lib/server/authorization/authorizationService';
import { ensureDefaultRoles } from '$lib/server/authorization/bootstrapRbac';
import { PERMISSIONS } from '$lib/server/authorization/permissions';

async function assertCanManageRbac(user: any) {
	const authorization = await authorize(user, 'rbac.manage');
	return authorization.allowed;
}

function getFormPermissions(formData: FormData) {
	return formData
		.getAll('permissions')
		.map((permission) => String(permission))
		.filter((permission) => PERMISSIONS.includes(permission as any));
}

export const load: PageServerLoad = async ({ locals }) => {
	await start_mongo();
	await ensureDefaultRoles();

	const user = locals.user;
	if (!user) {
		return {
			authorized: false,
			permissions: PERMISSIONS,
			roles: [],
			assignments: [],
			users: [],
			hubs: [],
			auditLogs: []
		};
	}

	const authorized = await assertCanManageRbac(user);
	if (!authorized) {
		return {
			authorized,
			permissions: PERMISSIONS,
			roles: [],
			assignments: [],
			users: [],
			hubs: [],
			auditLogs: []
		};
	}

	const [roles, assignments, users, hubs, auditLogs] = await Promise.all([
		Role.find({ scopeType: 'global', scopeId: null }).sort({ isSystem: -1, key: 1 }).lean(),
		UserRoleAssignment.find({ scopeType: 'global', isActive: true })
			.sort({ createdAt: -1 })
			.limit(250)
			.lean(),
		Users.find({})
			.select('id _id firstName lastName username email roles')
			.sort({ firstName: 1, lastName: 1 })
			.limit(500)
			.lean(),
		Hubs.find({}).select('id _id title type').sort({ title: 1 }).limit(250).lean(),
		EditorialAuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean()
	]);

	return {
		authorized,
		permissions: PERMISSIONS,
		roles: JSON.parse(JSON.stringify(roles)),
		assignments: JSON.parse(JSON.stringify(assignments)),
		users: JSON.parse(JSON.stringify(users)),
		hubs: JSON.parse(JSON.stringify(hubs)),
		auditLogs: JSON.parse(JSON.stringify(auditLogs))
	};
};

export const actions: Actions = {
	createRole: async ({ request, locals }) => {
		await start_mongo();
		if (!locals.user || !(await assertCanManageRbac(locals.user))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const key = String(formData.get('key') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim();
		const permissions = getFormPermissions(formData);

		if (!key || !name) {
			return fail(400, { message: 'Role key and name are required' });
		}

		await Role.updateOne(
			{ key, scopeType: 'global', scopeId: null },
			{
				$setOnInsert: {
					key,
					name,
					description,
					permissions,
					scopeType: 'global',
					scopeId: null,
					isSystem: false,
					isProtected: false,
					isActive: true
				}
			},
			{ upsert: true }
		);

		return { success: true };
	},
	updateRolePermissions: async ({ request, locals }) => {
		await start_mongo();
		if (!locals.user || !(await assertCanManageRbac(locals.user))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const roleKey = String(formData.get('roleKey') || '').trim();
		const permissions = getFormPermissions(formData);

		if (!roleKey) {
			return fail(400, { message: 'Role key is required' });
		}

		await Role.updateOne(
			{ key: roleKey, scopeType: 'global', scopeId: null },
			{
				$set: {
					permissions,
					updatedAt: new Date()
				}
			}
		);

		return { success: true };
	},
	assignRole: async ({ request, locals }) => {
		await start_mongo();
		if (!locals.user || !(await assertCanManageRbac(locals.user))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const userId = String(formData.get('userId') || '').trim();
		const roleKey = String(formData.get('roleKey') || '').trim();
		const scopeType = 'global';
		const scopeId = null;

		if (!userId || !roleKey) {
			return fail(400, { message: 'Invalid role assignment' });
		}

		const role = await Role.findOne({ key: roleKey, scopeType: 'global', scopeId: null, isActive: true });
		if (!role) {
			return fail(404, { message: 'Global role not found' });
		}

		await UserRoleAssignment.updateOne(
			{ userId, roleKey, scopeType, scopeId },
			{
				$set: {
					isActive: true,
					grantedBy: locals.user.id,
					updatedAt: new Date()
				},
				$setOnInsert: {
					userId,
					roleKey,
					scopeType,
					scopeId,
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);

		return { success: true };
	},
	revokeAssignment: async ({ request, locals }) => {
		await start_mongo();
		if (!locals.user || !(await assertCanManageRbac(locals.user))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const assignmentId = String(formData.get('assignmentId') || '').trim();
		if (!assignmentId) {
			return fail(400, { message: 'Assignment id is required' });
		}

		await UserRoleAssignment.updateOne(
			{ $or: [{ _id: assignmentId }, { id: assignmentId }], scopeType: 'global' },
			{
				$set: {
					isActive: false,
					updatedAt: new Date()
				}
			}
		);

		return { success: true };
	}
};
