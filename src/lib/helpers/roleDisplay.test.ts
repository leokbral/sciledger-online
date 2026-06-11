import { describe, expect, it } from 'vitest';
import {
	getDisplayRoles,
	getPrimaryRole,
	getRoleDisplay,
	getRoleLabel,
	getRolePriority,
	getSecondaryRoles
} from './roleDisplay';

describe('role display helpers', () => {
	it('uses the highest-precedence active role as the primary display role', () => {
		const assignments = [
			{ roleKey: 'Reviewer', isActive: true },
			{ roleKey: 'Author', isActive: true },
			{ roleKey: 'AssociateEditor', isActive: true }
		];

		expect(getPrimaryRole(assignments)).toBe('AssociateEditor');
		expect(getSecondaryRoles(assignments)).toEqual(['Reviewer', 'Author']);
	});

	it('uses explicit standard role priority values to calculate the highest role', () => {
		expect(getRolePriority('HubOwner')).toBe(100);
		expect(getRolePriority('EditorChief')).toBe(90);
		expect(getRolePriority('AssociateEditor')).toBe(70);
		expect(getRolePriority('Reviewer')).toBe(20);
		expect(getRolePriority('Author')).toBe(10);
		expect(
			getPrimaryRole([
				{ roleKey: 'Reviewer', isActive: true },
				{ roleKey: 'AssociateEditor', isActive: true },
				{ roleKey: 'EditorChief', isActive: true }
			])
		).toBe('EditorChief');
	});

	it('maps legacy ManagingEditor display to EditorChief', () => {
		const assignments = [
			{ roleKey: 'ManagingEditor', isActive: true },
			{ roleKey: 'Reviewer', isActive: true },
			{ roleKey: 'AssociateEditor', isActive: true }
		];

		expect(getPrimaryRole(assignments)).toBe('EditorChief');
		expect(getSecondaryRoles(assignments)).toEqual(['AssociateEditor', 'Reviewer']);
	});

	it('ignores inactive assignments and falls back to readable labels', () => {
		const assignments = [
			{ roleKey: 'HubOwner', isActive: false },
			{ roleKey: 'Reviewer', isActive: true }
		];

		expect(getPrimaryRole(assignments)).toBe('Reviewer');
		expect(getRoleLabel('AssociateEditor')).toBe('Associate Editor');
	});

	it('keeps every active role available for the visual role dropdown', () => {
		const roles = getDisplayRoles([
			{ roleKey: 'Reviewer', isActive: true },
			{ roleKey: 'AssociateEditor', isActive: true }
		]);

		expect(roles.map((role) => role.key)).toEqual(['AssociateEditor', 'Reviewer']);
		expect(getRoleDisplay('AssociateEditor')).toMatchObject({
			label: 'Associate Editor',
			priority: 70
		});
	});

	it('supports custom role keys with neutral priority', () => {
		const assignments = [{ roleKey: 'CopyEditor', isActive: true }];

		expect(getPrimaryRole(assignments)).toBe('CopyEditor');
		expect(getRolePriority('CopyEditor')).toBe(0);
		expect(getRoleLabel('CopyEditor')).toBe('CopyEditor');
	});

	it('can use role document priority and label when provided for display only', () => {
		const roles = getDisplayRoles([
			{ roleKey: 'Reviewer', isActive: true },
			{ roleKey: 'CopyEditor', roleName: 'Copy Editor', priority: 30, isActive: true }
		]);

		expect(roles.map((role) => role.key)).toEqual(['CopyEditor', 'Reviewer']);
		expect(roles[0]).toMatchObject({ label: 'Copy Editor', priority: 30 });
	});

	it('falls back to standard priority when a persisted standard role has legacy priority zero', () => {
		const roles = getDisplayRoles([
			{ roleKey: 'AssociateEditor', roleName: 'Associate Editor', priority: 0, isActive: true },
			{ roleKey: 'Author', roleName: 'Author', isActive: true }
		]);

		expect(roles.map((role) => role.key)).toEqual(['AssociateEditor', 'Author']);
		expect(roles[0]?.key).toBe('AssociateEditor');
	});
});
