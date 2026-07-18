import type { DashboardRole } from '$lib/components/Dashboard/types';
import type { HubRoleContext, HubSummary, HubWorkspaceResolution } from './hubTypes';

const HUB_LABELS: Record<DashboardRole, string> = {
	admin: 'Admin Workspace',
	editor: 'Editor Workspace',
	reviewer: 'Reviewer Workspace',
	author: 'Author Workspace',
	reader: 'Reader Workspace'
};

const ROLE_KEY_TO_WORKSPACE: Record<string, DashboardRole> = {
	admin: 'admin',
	hubadmin: 'admin',
	hubowner: 'admin',
	owner: 'admin',
	editor: 'editor',
	editorchief: 'editor',
	associateeditor: 'editor',
	managingeditor: 'editor',
	sectioneditor: 'editor',
	reviewer: 'reviewer',
	author: 'author',
	contributor: 'author',
	submitter: 'author',
	reader: 'reader',
	member: 'reader'
};

const ROLE_PRIORITY: DashboardRole[] = ['admin', 'editor', 'reviewer', 'author', 'reader'];

function normalizeRoleKey(value: unknown) {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function collectRoleKeys(context: HubRoleContext): string[] {
	if (!context) return [];

	if (typeof context === 'string') {
		return [normalizeRoleKey(context)].filter(Boolean);
	}

	const directKeys = [
		context.primaryRoleKey,
		context.roleKey,
		context.key,
		context.name,
		context.label,
		...(context.directRoleKeys ?? [])
	].map(normalizeRoleKey);

	const nestedKeys = (context.roles ?? []).flatMap((role) => collectRoleKeys(role));
	const capabilityKeys = [
		context.canManageRoles === true ? 'hubowner' : '',
		context.canManageHub === true ? 'editor' : '',
		context.canAssignReviewers === true ? 'editor' : '',
		context.canReview === true ? 'reviewer' : '',
		context.canSubmit === true ? 'author' : ''
	];

	return Array.from(new Set([...directKeys, ...nestedKeys, ...capabilityKeys].filter(Boolean)));
}

function getRoleContextFromHub(hub: HubSummary | null | undefined): HubRoleContext {
	if (!hub) return null;

	return (
		hub.hubRole ??
		hub.currentUserHubRole ??
		hub.currentUserRole ??
		hub.viewerRole ??
		hub.currentUserHubMember ??
		null
	);
}

export function resolveHubWorkspaceFromContext(context: HubRoleContext): HubWorkspaceResolution {
	const keys = collectRoleKeys(context);
	const roles = new Set(keys.map((key) => ROLE_KEY_TO_WORKSPACE[key]).filter(Boolean));
	const role = ROLE_PRIORITY.find((candidate) => roles.has(candidate)) ?? 'reader';
	const roleKey = keys.find((key) => ROLE_KEY_TO_WORKSPACE[key] === role) ?? null;

	return {
		role,
		label: HUB_LABELS[role],
		roleKey
	};
}

export function resolveHubWorkspaceForHub(
	hub: HubSummary | null | undefined,
	memberContext?: HubRoleContext
): HubWorkspaceResolution {
	const context = memberContext ?? getRoleContextFromHub(hub);
	return resolveHubWorkspaceFromContext(context);
}
