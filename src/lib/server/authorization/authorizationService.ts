import type mongoose from 'mongoose';
import Role from '$lib/db/models/Role';
import { start_mongo } from '$lib/db/mongooseConnection';
import { permissionRequiresResource, type PermissionKey } from './permissions';
import {
	getInheritedRoleKeys,
	getRoleDefinitionScopeKey,
	getRoleScopeKey,
	roleGrantsPermissionThroughHierarchy
} from './roleInheritance';
import {
	getUserIdAliases,
	normalizeEntityId,
	resolveResourceContext,
	resolveRoleAssignments,
	type AuthorizationResource,
	type ResourceContext,
	type ResolvedRoleAssignment
} from './roleResolver';

type AuthorizeOptions = {
	session?: mongoose.ClientSession | null;
};

export type AuthorizationResult = {
	allowed: boolean;
	permission: string;
	roleKeys: string[];
	assignments: ResolvedRoleAssignment[];
	context: ResourceContext;
	reason?: string;
};

function isAuthorOfPaper(paper: any, aliases: string[]) {
	if (!paper || aliases.length === 0) return false;
	const authorCandidates = [
		paper.mainAuthor,
		paper.correspondingAuthor,
		paper.submittedBy,
		...(Array.isArray(paper.coAuthors) ? paper.coAuthors : []),
		...(Array.isArray(paper.authors) ? paper.authors : [])
	];

	return authorCandidates.some((candidate) => {
		const normalized = normalizeEntityId(candidate);
		return !!normalized && aliases.includes(normalized);
	});
}

function roleScopeKey(scopeType: string, scopeId: string | null | undefined, roleKey: string) {
	return getRoleScopeKey(scopeType, scopeId, roleKey);
}

function roleQueryForAssignment(
	assignment: ResolvedRoleAssignment,
	context: ResourceContext
): Record<string, unknown> | null {
	if (assignment.scopeType === 'global') {
		return {
			key: assignment.roleKey,
			scopeType: 'global',
			scopeId: null
		};
	}

	if (assignment.scopeType === 'hub') {
		const scopeId = assignment.scopeId ?? context.hubId;
		if (!scopeId) return null;
		return {
			key: assignment.roleKey,
			scopeType: 'hub',
			scopeId
		};
	}

	if (assignment.scopeType === 'paper') {
		if (context.hubId) {
			return {
				key: assignment.roleKey,
				scopeType: 'hub',
				scopeId: context.hubId
			};
		}

		return {
			key: assignment.roleKey,
			scopeType: 'global',
			scopeId: null
		};
	}

	return null;
}

async function hasActiveReviewAssignment(
	user: any,
	context: ResourceContext,
	options: AuthorizeOptions
) {
	if (!context.paperId) {
		return false;
	}

	const aliases = getUserIdAliases(user);
	if (aliases.length === 0) {
		return false;
	}

	const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;

	const assignment = await ReviewAssignment.findOne({
		paperId: context.paperId,
		reviewerId: { $in: aliases },
		status: { $in: ['accepted', 'overdue', 'completed'] }
	})
		.session(options.session ?? null)
		.lean();

	if (assignment) {
		return true;
	}

	const responses = context.paper?.peer_review?.responses;
	if (!Array.isArray(responses)) {
		return false;
	}

	return responses.some((response: any) => {
		const reviewerId = normalizeEntityId(response.reviewerId);
		return (
			!!reviewerId &&
			aliases.includes(reviewerId) &&
			['accepted', 'completed'].includes(String(response.status))
		);
	});
}

async function loadInheritedRoles(directRoles: any[], options: AuthorizeOptions) {
	const rolesByScopeKey = new Map<string, any>();
	const frontier = [...directRoles];

	for (const role of directRoles) {
		rolesByScopeKey.set(getRoleDefinitionScopeKey(role), role);
	}

	while (frontier.length > 0) {
		const inheritedQueries: Record<string, unknown>[] = [];
		const seenQueryKeys = new Set<string>();

		for (const role of frontier.splice(0)) {
			for (const inheritedRoleKey of getInheritedRoleKeys(role)) {
				const scopeType = String(role.scopeType ?? 'global');
				const scopeId = role.scopeId ?? null;
				const scopeKey = roleScopeKey(scopeType, scopeId, inheritedRoleKey);
				if (rolesByScopeKey.has(scopeKey) || seenQueryKeys.has(scopeKey)) continue;

				seenQueryKeys.add(scopeKey);
				inheritedQueries.push({
					key: inheritedRoleKey,
					scopeType,
					scopeId
				});
			}
		}

		if (inheritedQueries.length === 0) {
			break;
		}

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

export async function authorize(
	user: any,
	permission: PermissionKey,
	resource?: AuthorizationResource | null,
	options: AuthorizeOptions = {}
): Promise<AuthorizationResult> {
	await start_mongo();

	const context = await resolveResourceContext(resource, options);

	if (permissionRequiresResource(permission) && !context.paperId && !context.hubId) {
		return {
			allowed: false,
			permission,
			roleKeys: [],
			assignments: [],
			context,
			reason: 'resource_context_required'
		};
	}

	const assignments = await resolveRoleAssignments(user, context, options);
	const roleKeys = [...new Set(assignments.map((assignment) => assignment.roleKey))];

	if (roleKeys.length === 0) {
		return {
			allowed: false,
			permission,
			roleKeys,
			assignments,
			context,
			reason: 'no_role_assignment'
		};
	}

	const roleQueries = assignments
		.map((assignment) => roleQueryForAssignment(assignment, context))
		.filter(Boolean) as Record<string, unknown>[];

	const directlyAssignedRoles =
		roleQueries.length > 0
			? await Role.find({
					$or: roleQueries,
					isActive: true
				})
					.session(options.session ?? null)
					.lean()
			: [];

	const rolesByScopeKey = await loadInheritedRoles(directlyAssignedRoles, options);
	const permittedRoleScopeKeys = new Set(
		directlyAssignedRoles
			.filter((role: any) => roleGrantsPermissionThroughHierarchy(role, permission, rolesByScopeKey))
			.map((role: any) => roleScopeKey(role.scopeType, role.scopeId, String(role.key)))
	);
	const permittedRoleKeys = [
		...new Set(
			assignments
				.filter((assignment) => {
					const query = roleQueryForAssignment(assignment, context);
					if (!query) return false;
					return permittedRoleScopeKeys.has(
						roleScopeKey(
							String(query.scopeType),
							(query.scopeId as string | null | undefined) ?? null,
							assignment.roleKey
						)
					);
				})
				.map((assignment) => assignment.roleKey)
		)
	];

	if (permittedRoleKeys.length === 0) {
		return {
			allowed: false,
			permission,
			roleKeys,
			assignments,
			context,
			reason: 'permission_not_granted'
		};
	}

	if (permission === 'review.submit') {
		const canSubmitReview = await hasActiveReviewAssignment(user, context, options);
		return {
			allowed: canSubmitReview,
			permission,
			roleKeys: permittedRoleKeys,
			assignments,
			context,
			reason: canSubmitReview ? undefined : 'review_assignment_required'
		};
	}

	if (permission === 'paper.edit' || permission === 'paper.withdraw') {
		const nonAuthorRole = permittedRoleKeys.some((roleKey) => roleKey !== 'Author');
		const userAliases = getUserIdAliases(user);
		const canEditOwnPaper = isAuthorOfPaper(context.paper, userAliases);
		const allowed = nonAuthorRole || canEditOwnPaper || !context.paperId;

		return {
			allowed,
			permission,
			roleKeys: permittedRoleKeys,
			assignments,
			context,
			reason: allowed ? undefined : 'author_scope_required'
		};
	}

	return {
		allowed: true,
		permission,
		roleKeys: permittedRoleKeys,
		assignments,
		context
	};
}

export async function can(
	user: any,
	permission: PermissionKey,
	resource?: AuthorizationResource | null,
	options: AuthorizeOptions = {}
) {
	const result = await authorize(user, permission, resource, options);
	return result.allowed;
}
