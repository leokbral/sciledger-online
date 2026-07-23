import type mongoose from 'mongoose';
import Hubs from '$lib/db/models/Hub';
import Role from '$lib/db/models/Role';
import Users from '$lib/db/models/User';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { start_mongo } from '$lib/db/mongooseConnection';
import { ensureHubLegacyRoleAssignments, ensureHubRoles } from './bootstrapRbac';
import {
	getInheritedRoleKeys,
	getRoleDefinitionScopeKey,
	roleGrantsPermissionThroughHierarchy
} from './roleInheritance';
import { normalizeEntityId } from './roleResolver';

type ResolveOptions = {
	session?: mongoose.ClientSession | null;
};

type EffectiveRoleSource = 'assignment';

export type EffectiveHubRoleEntry = {
	roleKey: string;
	source: EffectiveRoleSource;
	assignmentId?: string | null;
	priority: number;
	name?: string;
};

export type EffectiveHubMember = {
	userId: string;
	user?: any;
	primaryRoleKey: string | null;
	directRoleKeys: string[];
	effectiveRoleKeys: string[];
	permissions: string[];
	canReview: boolean;
	canManageMembers: boolean;
	canManageRoles: boolean;
	canAssignReviewers: boolean;
	roles: EffectiveHubRoleEntry[];
};

export type EffectiveHubRolesResult = {
	hubId: string;
	hub: any;
	members: EffectiveHubMember[];
	reviewers: any[];
	reviewerIds: string[];
	membersByUserId: Record<string, EffectiveHubMember>;
};

function normalizeHubRoleKey(roleKey: string) {
	if (roleKey === 'ManagingEditor') return 'EditorChief';
	return roleKey;
}

function getIdAliases(value: any): string[] {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') return [String(value)];
	if (typeof value !== 'object') return [];

	const aliases = [value.id, value._id].filter(Boolean).map((alias) => String(alias));
	const stringified = value.toString?.();
	if (stringified && stringified !== '[object Object]') aliases.push(String(stringified));

	return [...new Set(aliases.filter(Boolean))];
}

function pushRole(
	rolesByUserId: Map<string, EffectiveHubRoleEntry[]>,
	userId: string | undefined,
	role: EffectiveHubRoleEntry
) {
	if (!userId) return;
	const normalizedRoleKey = normalizeHubRoleKey(role.roleKey);
	const roleEntry = { ...role, roleKey: normalizedRoleKey };
	const current = rolesByUserId.get(userId) ?? [];
	const exists = current.some(
		(item) => item.roleKey === roleEntry.roleKey && item.source === roleEntry.source
	);
	if (!exists) rolesByUserId.set(userId, [...current, roleEntry]);
}

function collectInheritedRoleKeys(
	roleKey: string,
	rolesByKey: Map<string, any>,
	visited = new Set<string>()
): string[] {
	if (visited.has(roleKey)) return [];
	visited.add(roleKey);

	const role = rolesByKey.get(roleKey);
	const inherited = getInheritedRoleKeys(role);
	return [
		...inherited,
		...inherited.flatMap((inheritedRoleKey) =>
			collectInheritedRoleKeys(inheritedRoleKey, rolesByKey, new Set(visited))
		)
	];
}

function collectPermissions(
	roleKey: string,
	rolesByKey: Map<string, any>,
	visited = new Set<string>()
): string[] {
	if (visited.has(roleKey)) return [];
	visited.add(roleKey);

	const role = rolesByKey.get(roleKey);
	if (!role || role.isActive === false) return [];

	return [
		...(Array.isArray(role.permissions) ? role.permissions.map(String) : []),
		...getInheritedRoleKeys(role).flatMap((inheritedRoleKey) =>
			collectPermissions(inheritedRoleKey, rolesByKey, new Set(visited))
		)
	];
}

function hasPermission(roleKey: string, permission: string, rolesByScopeKey: Map<string, any>) {
	const role = [...rolesByScopeKey.values()].find((candidate: any) => candidate.key === roleKey);
	return !!role && roleGrantsPermissionThroughHierarchy(role, permission, rolesByScopeKey);
}

async function loadHub(hubOrId: any, session: mongoose.ClientSession | null) {
	if (hubOrId && typeof hubOrId === 'object') {
		return hubOrId;
	}

	const hubId = String(hubOrId || '').trim();
	if (!hubId) return null;

	return Hubs.findOne({ $or: [{ _id: hubId }, { id: hubId }] })
		.session(session)
		.lean();
}

export async function resolveEffectiveHubRoles(
	hubOrId: any,
	options: ResolveOptions = {}
): Promise<EffectiveHubRolesResult> {
	await start_mongo();

	const session = options.session ?? null;
	const hub = await loadHub(hubOrId, session);
	const hubId = normalizeEntityId(hub) ?? normalizeEntityId(hubOrId) ?? String(hubOrId || '');
	const hubAliases = [
		...new Set(
			[...getIdAliases(hub), normalizeEntityId(hubOrId), hubId].filter(Boolean).map(String)
		)
	];

	if (!hub || !hubId) {
		return {
			hubId,
			hub,
			members: [],
			reviewers: [],
			reviewerIds: [],
			membersByUserId: {}
		};
	}

	await Promise.all(hubAliases.map((alias) => ensureHubRoles(alias)));
	await ensureHubLegacyRoleAssignments(hub);

	const [hubRoles, assignments] = await Promise.all([
		Role.find({ scopeType: 'hub', scopeId: { $in: hubAliases }, isActive: true })
			.session(session)
			.lean(),
		UserRoleAssignment.find({ scopeType: 'hub', scopeId: { $in: hubAliases }, isActive: true })
			.session(session)
			.lean()
	]);

	const sortedHubRoles = (hubRoles as any[]).sort((left, right) => {
		const leftPreferred = String(left.scopeId) === hubId ? 0 : 1;
		const rightPreferred = String(right.scopeId) === hubId ? 0 : 1;
		return leftPreferred - rightPreferred;
	});
	const rolesByKey = new Map<string, any>();
	for (const role of sortedHubRoles) {
		const key = String(role.key);
		if (!rolesByKey.has(key)) rolesByKey.set(key, role);
	}
	const rolesByScopeKey = new Map<string, any>(
		sortedHubRoles.map((role) => [getRoleDefinitionScopeKey(role), role])
	);
	const rolesByUserId = new Map<string, EffectiveHubRoleEntry[]>();

	for (const assignment of assignments as any[]) {
		const roleKey = normalizeHubRoleKey(String(assignment.roleKey || ''));
		const role = rolesByKey.get(roleKey);
		pushRole(rolesByUserId, String(assignment.userId || ''), {
			roleKey,
			source: 'assignment',
			assignmentId: String(assignment._id || assignment.id || ''),
			priority: typeof role?.priority === 'number' ? role.priority : 0,
			name: role?.name
		});
	}

	const userIds = [...rolesByUserId.keys()];
	const users =
		userIds.length > 0
			? await Users.find({ $or: [{ _id: { $in: userIds } }, { id: { $in: userIds } }] })
					.session(session)
					.lean()
			: [];
	const usersById = new Map<string, any>();

	for (const user of users as any[]) {
		for (const alias of getIdAliases(user)) {
			usersById.set(alias, user);
		}
	}

	const members = userIds
		.map((userId) => {
			const roles = [...(rolesByUserId.get(userId) ?? [])].sort((left, right) => {
				return right.priority - left.priority || left.roleKey.localeCompare(right.roleKey);
			});
			const directRoleKeys = [...new Set(roles.map((role) => role.roleKey))];
			const effectiveRoleKeys = [
				...new Set([
					...directRoleKeys,
					...directRoleKeys.flatMap((roleKey) => collectInheritedRoleKeys(roleKey, rolesByKey))
				])
			];
			const permissions = [
				...new Set(directRoleKeys.flatMap((roleKey) => collectPermissions(roleKey, rolesByKey)))
			];
			const canReview = directRoleKeys.some((roleKey) =>
				hasPermission(roleKey, 'review.submit', rolesByScopeKey)
			);
			const canManageMembers = directRoleKeys.some((roleKey) =>
				hasPermission(roleKey, 'hub.manageMembers', rolesByScopeKey)
			);
			const canManageRoles = directRoleKeys.some((roleKey) =>
				hasPermission(roleKey, 'hub.manageRoles', rolesByScopeKey)
			);
			const canAssignReviewers = directRoleKeys.some((roleKey) =>
				hasPermission(roleKey, 'paper.assignReviewers', rolesByScopeKey)
			);

			return {
				userId,
				user: usersById.get(userId) ?? null,
				primaryRoleKey: roles[0]?.roleKey ?? null,
				directRoleKeys,
				effectiveRoleKeys,
				permissions,
				canReview,
				canManageMembers,
				canManageRoles,
				canAssignReviewers,
				roles
			};
		})
		.sort((left, right) => {
			const leftName = `${left.user?.firstName || ''} ${left.user?.lastName || ''}`.trim();
			const rightName = `${right.user?.firstName || ''} ${right.user?.lastName || ''}`.trim();
			return leftName.localeCompare(rightName);
		});

	const reviewers = members
		.filter((member) => member.canReview)
		.map((member) => ({
			...(member.user ?? { _id: member.userId, id: member.userId }),
			effectiveHubRole: {
				primaryRoleKey: member.primaryRoleKey,
				directRoleKeys: member.directRoleKeys,
				effectiveRoleKeys: member.effectiveRoleKeys,
				permissions: member.permissions
			}
		}));
	const reviewerIds = reviewers.flatMap((reviewer: any) => getIdAliases(reviewer));
	const membersByUserId = Object.fromEntries(
		members.flatMap((member) =>
			[member.userId, ...getIdAliases(member.user)].map((alias) => [alias, member])
		)
	);

	return {
		hubId,
		hub,
		members,
		reviewers,
		reviewerIds: [...new Set(reviewerIds)],
		membersByUserId
	};
}

export async function resolveEffectiveReviewersForHub(hubOrId: any, options: ResolveOptions = {}) {
	const result = await resolveEffectiveHubRoles(hubOrId, options);
	return result.reviewers;
}

export function getEffectiveHubMemberForUser(
	result: EffectiveHubRolesResult | null | undefined,
	user: any
) {
	const aliases = getIdAliases(user);
	return aliases.map((alias) => result?.membersByUserId?.[alias]).find(Boolean) ?? null;
}
