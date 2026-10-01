export const PERMISSIONS = [
	'paper.submit',
	'paper.edit',
	'paper.sendToReview',
	'paper.assignReviewers',
	'paper.requestCorrections',
	'paper.accept',
	'paper.reject',
	'paper.publish',
	'paper.withdraw',
	'review.submit',
	'review.assign',
	'review.manageDeadlines',
	'hub.manageMembers',
	'hub.manageEditors',
	'hub.manageRoles',
	'rbac.manage'
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number] | string;

/**
 * Platform-wide super administrator capability.
 *
 * This permission is deliberately NOT part of `PERMISSIONS`. That exclusion is a
 * security boundary, not an oversight:
 *
 *  - `DEFAULT_GLOBAL_ROLES.Admin` grants `[...PERMISSIONS]`, so listing it there
 *    would silently turn every existing Admin into a super administrator.
 *  - The RBAC admin screen renders its checkboxes from `PERMISSIONS` and filters
 *    submitted values against the same array, so a `rbac.manage` holder cannot
 *    attach this permission to a role through the UI.
 *
 * `PermissionKey` is a union with `string`, so `authorize(user, SUPER_ADMIN_PERMISSION)`
 * type-checks without the permission being a member of the array.
 */
export const SUPER_ADMIN_PERMISSION = 'platform.superAdmin';

/** Role key that carries `SUPER_ADMIN_PERMISSION` at global scope. */
export const SUPER_ADMIN_ROLE_KEY = 'SuperAdmin';

export const DEFAULT_GLOBAL_ROLES = [
	{
		key: SUPER_ADMIN_ROLE_KEY,
		name: 'Super Administrator',
		description:
			'Platform-wide administration: read access to every user, hub, paper, review and invitation. Granted only by the bootstrap script, never through the RBAC UI.',
		priority: 0,
		inheritsFrom: [],
		permissions: [SUPER_ADMIN_PERMISSION],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'Admin',
		name: 'Admin',
		description: 'Platform administrator with every editorial, support and RBAC permission.',
		priority: 0,
		inheritsFrom: [],
		permissions: [...PERMISSIONS],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'Support',
		name: 'Support',
		description: 'Platform support role for hub recovery and operational assistance.',
		priority: 0,
		inheritsFrom: [],
		permissions: ['hub.manageRoles', 'hub.manageMembers', 'hub.manageEditors'],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'Author',
		name: 'Author',
		description: 'Author role for submission and own-paper edits.',
		priority: 10,
		inheritsFrom: [],
		permissions: ['paper.submit', 'paper.edit', 'paper.withdraw'],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'Reviewer',
		name: 'Reviewer',
		description: 'Global reviewer compatibility role. review.submit also requires an active assignment.',
		priority: 20,
		inheritsFrom: [],
		permissions: ['review.submit'],
		isSystem: true,
		isProtected: true
	}
] as const;

export const DEFAULT_HUB_ROLES = [
	{
		key: 'HubOwner',
		name: 'Hub Owner',
		description: 'Protected top administrator for a single hub.',
		priority: 100,
		inheritsFrom: ['EditorChief'],
		permissions: [
			'paper.sendToReview',
			'paper.assignReviewers',
			'paper.requestCorrections',
			'paper.accept',
			'paper.reject',
			'paper.publish',
			'review.assign',
			'review.manageDeadlines',
			'hub.manageMembers',
			'hub.manageEditors',
			'hub.manageRoles'
		],
		isSystem: true,
		isProtected: true
	},
	{
		key: 'EditorChief',
		name: 'Editor Chief',
		description: 'Editor-in-chief for a scoped hub.',
		priority: 90,
		inheritsFrom: ['AssociateEditor'],
		permissions: [
			'paper.sendToReview',
			'paper.assignReviewers',
			'paper.requestCorrections',
			'paper.accept',
			'paper.reject',
			'paper.publish',
			'review.assign',
			'review.manageDeadlines',
			'hub.manageMembers',
			'hub.manageEditors'
		],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'AssociateEditor',
		name: 'Associate Editor',
		description: 'Default hub role for configurable editorial workflow actions.',
		priority: 70,
		inheritsFrom: ['Reviewer'],
		permissions: ['paper.sendToReview', 'paper.assignReviewers', 'paper.requestCorrections'],
		isSystem: true,
		isProtected: false
	},
	{
		key: 'Reviewer',
		name: 'Reviewer',
		description: 'Hub reviewer role. review.submit also requires an active assignment.',
		priority: 20,
		inheritsFrom: [],
		permissions: ['review.submit'],
		isSystem: true,
		isProtected: false
	}
] as const;

export const DEFAULT_ROLES = [...DEFAULT_GLOBAL_ROLES, ...DEFAULT_HUB_ROLES] as const;

export function permissionRequiresResource(permission: string) {
	if (permission === 'rbac.manage' || permission === 'paper.submit') {
		return false;
	}

	return (
		permission.startsWith('paper.') ||
		permission.startsWith('review.') ||
		permission.startsWith('hub.')
	);
}
