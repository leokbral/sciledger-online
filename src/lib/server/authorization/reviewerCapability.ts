import type mongoose from 'mongoose';
import Role from '$lib/db/models/Role';
import UserRoleAssignment from '$lib/db/models/UserRoleAssignment';
import { start_mongo } from '$lib/db/mongooseConnection';
import { ensureDefaultRoles, ensureHubRoles } from './bootstrapRbac';
import { getUserIdAliases } from './roleResolver';
import {
	getInheritedRoleKeys,
	getRoleDefinitionScopeKey,
	getRoleScopeKey,
	roleGrantsPermissionThroughHierarchy
} from './roleInheritance';

type ReviewerCapabilityOptions = {
	session?: mongoose.ClientSession | null;
	permission?: string;
};

function normalizeRoleKey(roleKey: string) {
	return roleKey === 'ManagingEditor' ? 'EditorChief' : roleKey;
}

async function loadRolesWithInheritance(directRoles: any[], options: ReviewerCapabilityOptions) {
	const rolesByScopeKey = new Map<string, any>();
	const frontier = [...directRoles];

	for (const role of directRoles) {
		rolesByScopeKey.set(getRoleDefinitionScopeKey(role), role);
	}

	while (frontier.length > 0) {
		const inheritedQueries: Record<string, unknown>[] = [];
		const seenQueryKeys = new Set<string>();

		for (const role of frontier.splice(0)) {
			const scopeType = String(role.scopeType ?? 'global');
			const scopeId = role.scopeId ?? null;

			for (const inheritedRoleKey of getInheritedRoleKeys(role)) {
				const scopeKey = getRoleScopeKey(scopeType, scopeId, inheritedRoleKey);
				if (rolesByScopeKey.has(scopeKey) || seenQueryKeys.has(scopeKey)) continue;

				seenQueryKeys.add(scopeKey);
				inheritedQueries.push({
					key: inheritedRoleKey,
					scopeType,
					scopeId
				});
			}
		}

		if (inheritedQueries.length === 0) break;

		const inheritedRoles = await Role.find({
			$or: inheritedQueries,
			isActive: true
		})
			.session(options.session ?? null)
			.lean();

		for (const role of inheritedRoles as any[]) {
			const scopeKey = getRoleDefinitionScopeKey(role);
			if (!rolesByScopeKey.has(scopeKey)) {
				rolesByScopeKey.set(scopeKey, role);
				frontier.push(role);
			}
		}
	}

	return rolesByScopeKey;
}

export async function hasReviewerCapability(
	user: any,
	options: ReviewerCapabilityOptions = {}
) {
	await start_mongo();
	await ensureDefaultRoles();

	const aliases = getUserIdAliases(user);
	if (aliases.length === 0) return false;

	const assignments = await UserRoleAssignment.find({
		userId: { $in: aliases },
		isActive: true,
		scopeType: { $in: ['global', 'hub'] }
	})
		.session(options.session ?? null)
		.lean();

	if (assignments.length === 0) return false;

	const hubIds = [
		...new Set(
			assignments
				.filter((assignment: any) => assignment.scopeType === 'hub' && assignment.scopeId)
				.map((assignment: any) => String(assignment.scopeId))
		)
	];
	for (const hubId of hubIds) {
		await ensureHubRoles(hubId);
	}

	const roleQueries = assignments
		.map((assignment: any) => ({
			key: normalizeRoleKey(String(assignment.roleKey)),
			scopeType: String(assignment.scopeType),
			scopeId: assignment.scopeType === 'global' ? null : assignment.scopeId
		}))
		.filter((query: any) => query.scopeType === 'global' || query.scopeId);

	if (roleQueries.length === 0) return false;

	const directRoles = await Role.find({
		$or: roleQueries,
		isActive: true
	})
		.session(options.session ?? null)
		.lean();

	if (directRoles.length === 0) return false;

	const rolesByScopeKey = await loadRolesWithInheritance(directRoles, options);
	const permission = options.permission ?? 'review.submit';

	return directRoles.some((role: any) =>
		roleGrantsPermissionThroughHierarchy(role, permission, rolesByScopeKey)
	);
}
