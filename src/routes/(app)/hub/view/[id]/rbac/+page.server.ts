import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import Hubs from '$lib/db/models/Hub';
import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import Users from '$lib/db/models/User';
import RbacAuditLog from '$lib/db/models/RbacAuditLog';
import { start_mongo } from '$lib/db/mongooseConnection';
import { authorize } from '$lib/server/authorization/authorizationService';
import { ensureHubRoles } from '$lib/server/authorization/bootstrapRbac';
import { DEFAULT_HUB_ROLES, PERMISSIONS } from '$lib/server/authorization/permissions';
import { createRbacAuditLog } from '$lib/server/authorization/rbacAudit';
import { assignHighestHubRole } from '$lib/server/authorization/roleAssignmentService';
import { emitEvent } from '$lib/services/EventService';

const HUB_CONFIGURABLE_PERMISSIONS = PERMISSIONS.filter(
	(permission) => permission !== 'rbac.manage' && permission !== 'paper.submit'
);
const RESTORABLE_EDITORIAL_ROLE_KEYS = ['EditorChief', 'AssociateEditor', 'Reviewer'];

function normalizeId(value: any): string {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return '';
}

function serialize<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function getFormPermissions(formData: FormData) {
	return formData
		.getAll('permissions')
		.map((permission) => String(permission))
		.filter((permission) => HUB_CONFIGURABLE_PERMISSIONS.includes(permission as any));
}

async function loadHub(hubId: string) {
	const hub = await Hubs.findById(hubId).lean();
	if (!hub) {
		throw error(404, 'Hub not found');
	}
	return hub;
}

async function assertCanManageHubRoles(user: any, hub: any) {
	const authorization = await authorize(user, 'hub.manageRoles', { hub });
	return authorization.allowed;
}

async function countActiveHubOwners(hubId: string) {
	return UserRoleAssignment.countDocuments({
		roleKey: 'HubOwner',
		scopeType: 'hub',
		scopeId: hubId,
		isActive: true
	});
}

async function getRoleConfigurationRecipients(hubId: string, actorId?: string) {
	const managerAssignments = await UserRoleAssignment.find({
		roleKey: { $in: ['HubOwner', 'EditorChief'] },
		scopeType: 'hub',
		scopeId: hubId,
		isActive: true
	})
		.select('userId')
		.lean();

	const recipientIds = [
		actorId,
		...managerAssignments.map((assignment: any) => String(assignment.userId || ''))
	].filter((recipientId): recipientId is string => !!recipientId);

	return [...new Set(recipientIds)];
}

async function emitRoleConfigurationEvent(input: {
	type: 'role.created' | 'role.updated';
	user: any;
	hubId: string;
	role: any;
	metadata?: Record<string, unknown>;
}) {
	try {
		const actorId = normalizeId(input.user);
		const recipients = await getRoleConfigurationRecipients(input.hubId, actorId);

		await emitEvent({
			type: input.type,
			actorId,
			recipients,
			entityType: 'role',
			entityId: normalizeId(input.role) || String(input.role.key),
			metadata: {
				hubId: input.hubId,
				roleKey: input.role.key,
				roleName: input.role.name,
				actorName:
					`${input.user?.firstName || ''} ${input.user?.lastName || ''}`.trim() ||
					input.user?.email,
				recipientRoles: Object.fromEntries(
					recipients.map((recipientId) => [
						recipientId,
						recipientId === actorId ? 'actor' : 'manager'
					])
				),
				...input.metadata
			}
		});
	} catch (eventError) {
		console.error(`Failed to emit ${input.type} event:`, eventError);
	}
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(302, '/login');

	await start_mongo();
	const hub = await loadHub(params.id);
	const hubId = normalizeId(hub);
	const statusMessage =
		url.searchParams.get('assigned') === '1'
			? 'Role assigned successfully'
			: url.searchParams.get('covered') === '1'
				? 'This role is already covered by a higher assignment'
			: url.searchParams.get('revoked') === '1'
				? 'Assignment revoked successfully'
				: null;

	await ensureHubRoles(hubId);

	const authorized = await assertCanManageHubRoles(locals.user, hub);
	if (!authorized) {
		return {
			authorized: false,
			hub: serialize(hub),
			permissions: HUB_CONFIGURABLE_PERMISSIONS,
			roles: [],
			assignments: [],
			users: [],
			auditLogs: [],
			statusMessage
		};
	}

	const [roles, assignments, users, auditLogs] = await Promise.all([
		Role.find({ scopeType: 'hub', scopeId: hubId })
			.sort({ priority: -1, isProtected: -1, isSystem: -1, key: 1 })
			.lean(),
		UserRoleAssignment.find({ scopeType: 'hub', scopeId: hubId, isActive: true })
			.sort({ roleKey: 1, createdAt: -1 })
			.lean(),
		Users.find({})
			.select('id _id firstName lastName username email roles')
			.sort({ firstName: 1, lastName: 1 })
			.limit(500)
			.lean(),
		RbacAuditLog.find({ hubId }).sort({ createdAt: -1 }).limit(100).lean()
	]);

	return {
		authorized: true,
		hub: serialize(hub),
		permissions: HUB_CONFIGURABLE_PERMISSIONS,
		roles: serialize(roles),
		assignments: serialize(assignments),
		users: serialize(users),
		auditLogs: serialize(auditLogs),
		statusMessage
	};
};

export const actions: Actions = {
	restoreDefaultEditorialRoles: async ({ locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const restoredRoles = [];
		for (const defaultRole of DEFAULT_HUB_ROLES.filter((role) =>
			RESTORABLE_EDITORIAL_ROLE_KEYS.includes(role.key)
		)) {
			const existingRole: any = await Role.findOne({
				key: defaultRole.key,
				scopeType: 'hub',
				scopeId: hubId
			});

			const previousPermissions = existingRole?.permissions ?? [];
			const role = await Role.findOneAndUpdate(
				{ key: defaultRole.key, scopeType: 'hub', scopeId: hubId },
				{
					$set: {
						name: defaultRole.name,
						description: defaultRole.description,
						permissions: defaultRole.permissions,
						priority: defaultRole.priority,
						inheritsFrom: defaultRole.inheritsFrom,
						isSystem: true,
						isProtected: false,
						isActive: true,
						updatedAt: new Date()
					},
					$setOnInsert: {
						key: defaultRole.key,
						scopeType: 'hub',
						scopeId: hubId,
						createdAt: new Date()
					}
				},
				{ upsert: true, new: true }
			);

			restoredRoles.push(defaultRole.key);
			await createRbacAuditLog({
				user: locals.user,
				action: 'role.defaults.restored',
				hubId,
				roleKey: defaultRole.key,
				roleId: normalizeId(role),
				previousPermissions,
				newPermissions: [...defaultRole.permissions],
				metadata: {
					scope: 'default-editorial-roles'
				}
			});

			await emitRoleConfigurationEvent({
				type: 'role.updated',
				user: locals.user,
				hubId,
				role,
				metadata: {
					action: 'role.defaults.restored',
					previousPermissions,
					newPermissions: [...defaultRole.permissions]
				}
			});
		}

		return { success: true, restoredRoles };
	},

	createRole: async ({ request, locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const key = String(formData.get('key') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim();
		const permissions = getFormPermissions(formData);

		if (!/^[A-Za-z][A-Za-z0-9_:-]{1,63}$/.test(key)) {
			return fail(400, { message: 'Role key must start with a letter and contain no spaces' });
		}

		if (!name) {
			return fail(400, { message: 'Role name is required' });
		}

		const defaultRoleKeys = new Set<string>(DEFAULT_HUB_ROLES.map((role) => role.key));
		if (defaultRoleKeys.has(key)) {
			return fail(409, { message: 'Default hub roles already exist for this hub' });
		}

		const existing = await Role.findOne({ key, scopeType: 'hub', scopeId: hubId }).lean();
		if (existing) {
			return fail(409, { message: 'A role with this key already exists in this hub' });
		}

		const role = await Role.create({
			key,
			name,
			description,
			permissions,
			scopeType: 'hub',
			scopeId: hubId,
			isSystem: false,
			isProtected: false,
			isActive: true
		});

		await createRbacAuditLog({
			user: locals.user,
			action: 'role.created',
			hubId,
			roleKey: key,
			roleId: normalizeId(role),
			newPermissions: permissions
		});

		await emitRoleConfigurationEvent({
			type: 'role.created',
			user: locals.user,
			hubId,
			role,
			metadata: {
				newPermissions: permissions
			}
		});

		return { success: true };
	},

	updateRolePermissions: async ({ request, locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const roleId = String(formData.get('roleId') || '').trim();
		const permissions = getFormPermissions(formData);

		const role: any = await Role.findOne({
			$or: [{ _id: roleId }, { id: roleId }],
			scopeType: 'hub',
			scopeId: hubId
		});

		if (!role) return fail(404, { message: 'Role not found' });
		if (role.isProtected || role.key === 'HubOwner') {
			return fail(400, { message: 'HubOwner is protected and cannot be modified' });
		}

		const previousPermissions = [...(role.permissions ?? [])];
		role.permissions = permissions;
		role.updatedAt = new Date();
		await role.save();

		await createRbacAuditLog({
			user: locals.user,
			action: 'role.permissions.updated',
			hubId,
			roleKey: role.key,
			roleId: normalizeId(role),
			previousPermissions,
			newPermissions: permissions
		});

		await emitRoleConfigurationEvent({
			type: 'role.updated',
			user: locals.user,
			hubId,
			role,
			metadata: {
				action: 'role.permissions.updated',
				previousPermissions,
				newPermissions: permissions
			}
		});

		return { success: true };
	},

	deleteRole: async ({ request, locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const roleId = String(formData.get('roleId') || '').trim();

		const role: any = await Role.findOne({
			$or: [{ _id: roleId }, { id: roleId }],
			scopeType: 'hub',
			scopeId: hubId
		});

		if (!role) return fail(404, { message: 'Role not found' });
		if (role.isProtected || role.key === 'HubOwner') {
			return fail(400, { message: 'HubOwner is protected and cannot be removed' });
		}

		const activeAssignments = await UserRoleAssignment.countDocuments({
			roleKey: role.key,
			scopeType: 'hub',
			scopeId: hubId,
			isActive: true
		});

		if (activeAssignments > 0) {
			return fail(409, { message: 'Revoke active assignments before removing this role' });
		}

		role.isActive = false;
		role.updatedAt = new Date();
		await role.save();

		await createRbacAuditLog({
			user: locals.user,
			action: 'role.removed',
			hubId,
			roleKey: role.key,
			roleId: normalizeId(role),
			previousPermissions: role.permissions ?? []
		});

		await emitRoleConfigurationEvent({
			type: 'role.updated',
			user: locals.user,
			hubId,
			role,
			metadata: {
				action: 'role.removed',
				previousPermissions: role.permissions ?? []
			}
		});

		return { success: true };
	},

	assignRole: async ({ request, locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const userId = String(formData.get('userId') || '').trim();
		const roleKey = String(formData.get('roleKey') || '').trim();

		if (!userId || !roleKey) {
			return fail(400, { message: 'User and role are required' });
		}

		const [targetUser, role] = await Promise.all([
			Users.findOne({ $or: [{ id: userId }, { _id: userId }] }).lean(),
			Role.findOne({ key: roleKey, scopeType: 'hub', scopeId: hubId, isActive: true }).lean()
		]);

		if (!targetUser) return fail(404, { message: 'User not found' });
		if (!role) return fail(404, { message: 'Role not found in this hub' });

		const normalizedTargetUserId = normalizeId(targetUser) || userId;
		const assignmentResult = await assignHighestHubRole(
			normalizedTargetUserId,
			hubId,
			roleKey,
			locals.user.id,
			{ auditUser: locals.user }
		);

		if (!assignmentResult.assignment) {
			return fail(500, { message: 'Failed to persist role assignment' });
		}

		if (assignmentResult.coveredByRoleKey) {
			throw redirect(303, `/hub/view/${params.id}/rbac?covered=1`);
		}

		throw redirect(303, `/hub/view/${params.id}/rbac?assigned=1`);
	},

	revokeAssignment: async ({ request, locals, params }) => {
		await start_mongo();
		if (!locals.user) return fail(401, { message: 'Unauthorized' });

		const hub = await loadHub(params.id);
		const hubId = normalizeId(hub);
		if (!(await assertCanManageHubRoles(locals.user, hub))) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const formData = await request.formData();
		const assignmentId = String(formData.get('assignmentId') || '').trim();
		if (!assignmentId) return fail(400, { message: 'Assignment id is required' });

		const assignment: any = await UserRoleAssignment.findOne({
			$or: [{ _id: assignmentId }, { id: assignmentId }],
			scopeType: 'hub',
			scopeId: hubId,
			isActive: true
		});

		if (!assignment) return fail(404, { message: 'Assignment not found' });

		if (assignment.roleKey === 'HubOwner') {
			const activeOwnerCount = await countActiveHubOwners(hubId);
			if (activeOwnerCount <= 1) {
				return fail(409, {
					message: 'Every hub must keep at least one active HubOwner. Assign another HubOwner first.'
				});
			}
		}

		assignment.isActive = false;
		assignment.updatedAt = new Date();
		await assignment.save();

		await createRbacAuditLog({
			user: locals.user,
			action: 'role.assignment.revoked',
			hubId,
			roleKey: assignment.roleKey,
			targetUserId: assignment.userId
		});

		try {
			await emitEvent({
				type: 'role.revoked',
				actorId: locals.user.id,
				recipients: [String(assignment.userId)],
				entityType: 'role',
				entityId: String(assignment._id || assignment.id || assignment.roleKey),
				metadata: {
					hubId,
					roleKey: assignment.roleKey,
					targetUserId: String(assignment.userId),
					revokedBy: locals.user.id,
					recipientRoles: {
						[String(assignment.userId)]: 'target'
					}
				}
			});
		} catch (eventError) {
			console.error('Failed to emit role revoked event:', eventError);
		}

		throw redirect(303, `/hub/view/${params.id}/rbac?revoked=1`);
	}
};
