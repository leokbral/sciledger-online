import { describe, expect, it } from 'vitest';
import {
	canTransitionFromExpectedStatus,
	resolvePermittedRoleKeys,
	type RolePermissions,
	type ScopedAssignment
} from './scopeRules';

const roles: RolePermissions[] = [
	{
		key: 'AssociateEditor',
		scopeType: 'hub',
		scopeId: 'journal-a',
		permissions: ['paper.sendToReview', 'paper.assignReviewers']
	},
	{
		key: 'Reviewer',
		scopeType: 'hub',
		scopeId: 'journal-b',
		permissions: ['review.submit']
	},
	{
		key: 'Admin',
		scopeType: 'global',
		scopeId: null,
		permissions: ['paper.sendToReview', 'paper.reject', 'rbac.manage']
	}
];

describe('RBAC scope rules', () => {
	it('does not leak a hub-scoped editor role to another hub', () => {
		const assignments: ScopedAssignment[] = [
			{
				roleKey: 'AssociateEditor',
				scopeType: 'hub',
				scopeId: 'journal-a'
			},
			{
				roleKey: 'Reviewer',
				scopeType: 'hub',
				scopeId: 'journal-b'
			}
		];

		expect(
			resolvePermittedRoleKeys(assignments, roles, 'paper.sendToReview', {
				hubId: 'journal-a'
			})
		).toEqual(['AssociateEditor']);

		expect(
			resolvePermittedRoleKeys(assignments, roles, 'paper.sendToReview', {
				hubId: 'journal-b'
			})
		).toEqual([]);
	});

	it('applies global roles across resource scopes', () => {
		const assignments: ScopedAssignment[] = [
			{
				roleKey: 'Admin',
				scopeType: 'global'
			}
		];

		expect(
			resolvePermittedRoleKeys(assignments, roles, 'paper.reject', {
				hubId: 'journal-b',
				paperId: 'paper-1'
			})
		).toEqual(['Admin']);
	});

	it('keeps paper-scoped roles limited to one paper', () => {
		const assignments: ScopedAssignment[] = [
			{
				roleKey: 'AssociateEditor',
				scopeType: 'paper',
				scopeId: 'paper-1'
			}
		];

		expect(
			resolvePermittedRoleKeys(assignments, roles, 'paper.assignReviewers', {
				hubId: 'journal-a',
				paperId: 'paper-1'
			})
		).toEqual(['AssociateEditor']);

		expect(
			resolvePermittedRoleKeys(assignments, roles, 'paper.assignReviewers', {
				hubId: 'journal-a',
				paperId: 'paper-2'
			})
		).toEqual([]);
	});

	it('allows the same hub role key to have different permissions per journal', () => {
		const scopedRoles: RolePermissions[] = [
			{
				key: 'AssociateEditor',
				scopeType: 'hub',
				scopeId: 'journal-a',
				permissions: ['paper.sendToReview', 'paper.assignReviewers']
			},
			{
				key: 'AssociateEditor',
				scopeType: 'hub',
				scopeId: 'journal-b',
				permissions: ['paper.assignReviewers']
			}
		];

		const assignments: ScopedAssignment[] = [
			{
				roleKey: 'AssociateEditor',
				scopeType: 'hub',
				scopeId: 'journal-a'
			}
		];

		expect(
			resolvePermittedRoleKeys(assignments, scopedRoles, 'paper.sendToReview', {
				hubId: 'journal-a'
			})
		).toEqual(['AssociateEditor']);

		expect(
			resolvePermittedRoleKeys(assignments, scopedRoles, 'paper.sendToReview', {
				hubId: 'journal-b'
			})
		).toEqual([]);

		expect(
			resolvePermittedRoleKeys(
				[{ roleKey: 'AssociateEditor', scopeType: 'hub', scopeId: 'journal-b' }],
				scopedRoles,
				'paper.sendToReview',
				{ hubId: 'journal-b' }
			)
		).toEqual([]);
	});

	it('requires current status to match expectedStatus before a transition can proceed', () => {
		expect(
			canTransitionFromExpectedStatus('reviewer assignment', 'reviewer assignment', [
				'reviewer assignment'
			])
		).toBe(true);

		expect(
			canTransitionFromExpectedStatus('in review', 'reviewer assignment', ['reviewer assignment'])
		).toBe(false);
	});
});
