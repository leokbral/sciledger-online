import type mongoose from 'mongoose';
import Hubs from '$lib/db/models/Hub';
import Papers from '$lib/db/models/Paper';
import UserRoleAssignment, { type RoleScopeType } from '$lib/db/models/UserRoleAssignment';
import { ensureDefaultRoles, ensureHubRoles } from './bootstrapRbac';

export type AuthorizationResource = {
	paperId?: string;
	paper?: any;
	hubId?: string;
	hub?: any;
	global?: boolean;
};

export type ResourceContext = {
	paperId?: string;
	hubId?: string;
	paper?: any;
	hub?: any;
	global?: boolean;
};

export type ResolvedRoleAssignment = {
	roleKey: string;
	scopeType: RoleScopeType;
	scopeId?: string | null;
	source: 'assignment';
};

type QueryOptions = {
	session?: mongoose.ClientSession | null;
};

export function normalizeEntityId(input: any): string | undefined {
	if (!input) return undefined;
	if (typeof input === 'string') return input;
	if (typeof input === 'number') return String(input);
	if (typeof input === 'object') {
		if (input.id) return String(input.id);
		if (input._id) return String(input._id);
	}
	return undefined;
}

export function getUserIdAliases(user: any): string[] {
	return [...new Set([normalizeEntityId(user), user?.id, user?._id].filter(Boolean).map(String))];
}

export async function resolveResourceContext(
	resource?: AuthorizationResource | null,
	options: QueryOptions = {}
): Promise<ResourceContext> {
	if (!resource) {
		return {};
	}

	const context: ResourceContext = { global: resource.global };

	if (resource.paper) {
		context.paper = resource.paper;
		context.paperId = normalizeEntityId(resource.paper);
		context.hubId = normalizeEntityId(resource.paper.hubId);
	}

	if (!context.paper && resource.paperId) {
		const paper = await Papers.findOne({
			$or: [{ id: String(resource.paperId) }, { _id: String(resource.paperId) }]
		})
			.session(options.session ?? null)
			.lean();

		if (paper) {
			context.paper = paper;
			context.paperId = normalizeEntityId(paper);
			context.hubId = normalizeEntityId((paper as any).hubId);
		} else {
			context.paperId = String(resource.paperId);
		}
	}

	if (resource.hub) {
		context.hub = resource.hub;
		context.hubId = normalizeEntityId(resource.hub);
	}

	if (!context.hubId && resource.hubId) {
		context.hubId = String(resource.hubId);
	}

	if (context.hubId && !context.hub) {
		const hub = await Hubs.findOne({
			$or: [{ id: context.hubId }, { _id: context.hubId }]
		})
			.session(options.session ?? null)
			.lean();

		if (hub) {
			context.hub = hub;
			context.hubId = normalizeEntityId(hub);
		}
	}

	return context;
}

function normalizeResolvedRoleKey(roleKey: string) {
	if (roleKey === 'ManagingEditor') return 'EditorChief';
	return roleKey;
}

export async function resolveRoleAssignments(
	user: any,
	context: ResourceContext,
	options: QueryOptions = {}
): Promise<ResolvedRoleAssignment[]> {
	await ensureDefaultRoles();
	if (context.hubId) {
		await ensureHubRoles(context.hubId);
	}

	const aliases = getUserIdAliases(user);
	if (aliases.length === 0) {
		return [];
	}

	const scopes: Array<{ scopeType: RoleScopeType; scopeId?: string | null }> = [
		{ scopeType: 'global' }
	];

	if (context.hubId) {
		scopes.push({ scopeType: 'hub', scopeId: context.hubId });
	}

	if (context.paperId) {
		scopes.push({ scopeType: 'paper', scopeId: context.paperId });
	}

	const assignmentRows = await UserRoleAssignment.find({
		userId: { $in: aliases },
		isActive: true,
		$or: scopes.map((scope) =>
			scope.scopeType === 'global'
				? { scopeType: 'global' }
				: { scopeType: scope.scopeType, scopeId: scope.scopeId }
		)
	})
		.session(options.session ?? null)
		.lean();

	const assignments: ResolvedRoleAssignment[] = assignmentRows.map((assignment: any) => ({
		roleKey: normalizeResolvedRoleKey(String(assignment.roleKey)),
		scopeType: assignment.scopeType,
		scopeId: assignment.scopeId ?? null,
		source: 'assignment'
	}));

	return assignments;
}
