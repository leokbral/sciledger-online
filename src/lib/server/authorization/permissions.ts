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

export const DEFAULT_GLOBAL_ROLES = [
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
