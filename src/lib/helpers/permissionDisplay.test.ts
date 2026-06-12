import { describe, expect, it } from 'vitest';
import {
	getPermissionLabel,
	getRoleCapabilityProfile,
	groupPermissionsForDisplay
} from './permissionDisplay';

describe('permission display helpers', () => {
	it('maps technical permission keys to user-facing labels', () => {
		expect(getPermissionLabel('paper.accept')).toBe('Accept Papers');
		expect(getPermissionLabel('review.submit')).toBe('Submit Reviews');
		expect(getPermissionLabel('hub.manageRoles')).toBe('Manage Roles');
	});

	it('falls back without exposing technical prefixes', () => {
		expect(getPermissionLabel('paper.customDecision')).toBe('Custom Decision');
	});

	it('groups permissions by product area', () => {
		const groups = groupPermissionsForDisplay([
			'paper.accept',
			'review.submit',
			'hub.manageMembers'
		]);

		expect(groups.map((group) => group.label)).toEqual(['Papers', 'Reviews', 'Hub Management']);
	});

	it('uses professional role capability profiles', () => {
		expect(getRoleCapabilityProfile({ key: 'HubOwner' })).toMatchObject({
			title: 'Hub Owner',
			summary: 'Administrator of the Hub'
		});
		expect(getRoleCapabilityProfile({ key: 'Reviewer' }).capabilities).toContain('Submit Reviews');
	});
});
