export type RoleCapabilityProfile = {
	title: string;
	summary: string;
	capabilities: string[];
};

export const PERMISSION_LABELS: Record<string, string> = {
	'paper.submit': 'Submit Papers',
	'paper.edit': 'Edit Papers',
	'paper.sendToReview': 'Send Papers to Review',
	'paper.assignReviewers': 'Assign Reviewers',
	'paper.requestCorrections': 'Request Corrections',
	'paper.accept': 'Accept Papers',
	'paper.reject': 'Reject Papers',
	'paper.publish': 'Publish Papers',
	'paper.withdraw': 'Withdraw Papers',
	'review.submit': 'Submit Reviews',
	'review.assign': 'Assign Reviews',
	'review.manageDeadlines': 'Manage Review Deadlines',
	'hub.manageMembers': 'Manage Members',
	'hub.manageEditors': 'Manage Editors',
	'hub.manageRoles': 'Manage Roles',
	'rbac.manage': 'Manage Platform RBAC'
};

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
	paper: 'Papers',
	review: 'Reviews',
	hub: 'Hub Management',
	rbac: 'Platform Administration',
	other: 'Other'
};

export const STANDARD_ROLE_CAPABILITY_PROFILES: Record<string, RoleCapabilityProfile> = {
	HubOwner: {
		title: 'Hub Owner',
		summary: 'Administrator of the Hub',
		capabilities: [
			'Manage Members',
			'Manage Roles',
			'Manage Editors',
			'Configure Journal',
			'Manage Editorial Workflow',
			'Publish Papers'
		]
	},
	EditorChief: {
		title: 'Editor Chief',
		summary: 'Scientific leader of the journal',
		capabilities: [
			'Accept Papers',
			'Reject Papers',
			'Publish Papers',
			'Supervise Editors',
			'Resolve Editorial Conflicts'
		]
	},
	AssociateEditor: {
		title: 'Associate Editor',
		summary: 'Responsible for assigned papers',
		capabilities: [
			'Assign Reviewers',
			'Manage Paper Reviews',
			'Request Corrections',
			'Analyze Reviews',
			'Recommend Decisions'
		]
	},
	Reviewer: {
		title: 'Reviewer',
		summary: 'Scientific reviewer',
		capabilities: ['Review Papers', 'Submit Reviews', 'Provide Recommendations']
	},
	Author: {
		title: 'Author',
		summary: 'Paper author',
		capabilities: ['Submit Papers', 'Edit Own Papers', 'Track Editorial Decisions']
	}
};

const ROLE_PROFILE_ALIASES: Record<string, string> = {
	ManagingEditor: 'EditorChief'
};

function titleCaseWords(value: string) {
	return value
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[-_.]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getPermissionLabel(permission: string | null | undefined) {
	if (!permission) return 'Permission';
	const permissionKey = String(permission);
	const label = PERMISSION_LABELS[permissionKey];
	if (label) return label;

	const withoutScope = permissionKey.includes('.')
		? permissionKey.split('.').slice(1).join(' ')
		: permissionKey;
	return titleCaseWords(withoutScope);
}

export function getPermissionGroupKey(permission: string | null | undefined) {
	if (!permission || !String(permission).includes('.')) return 'other';
	return String(permission).split('.')[0] || 'other';
}

export function getPermissionGroupLabel(permissionOrGroupKey: string | null | undefined) {
	const key = permissionOrGroupKey?.includes('.')
		? getPermissionGroupKey(permissionOrGroupKey)
		: permissionOrGroupKey || 'other';
	return PERMISSION_GROUP_LABELS[key] ?? titleCaseWords(key);
}

export function groupPermissionsForDisplay(permissions: readonly string[]) {
	const groups = new Map<string, string[]>();

	for (const permission of permissions) {
		const groupKey = getPermissionGroupKey(permission);
		const group = groups.get(groupKey) ?? [];
		group.push(permission);
		groups.set(groupKey, group);
	}

	return [...groups.entries()].map(([key, values]) => ({
		key,
		label: getPermissionGroupLabel(key),
		permissions: values
	}));
}

export function getRoleCapabilityProfile(role: {
	key?: string | null;
	name?: string | null;
	description?: string | null;
	permissions?: string[] | null;
}) {
	const roleKey = role.key ? ROLE_PROFILE_ALIASES[role.key] ?? role.key : '';
	const standardProfile = STANDARD_ROLE_CAPABILITY_PROFILES[roleKey];
	if (standardProfile) return standardProfile;

	const capabilities = Array.isArray(role.permissions)
		? role.permissions.map(getPermissionLabel)
		: [];

	return {
		title: role.name || role.key || 'Custom Role',
		summary: role.description || 'Custom role configured for this hub workflow',
		capabilities: capabilities.length > 0 ? capabilities : ['Custom Editorial Capabilities']
	};
}
