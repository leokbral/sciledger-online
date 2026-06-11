import { describe, expect, it } from 'vitest';
import {
	getRoleDefinitionScopeKey,
	roleGrantsPermissionThroughHierarchy,
	roleInheritsRole,
	type RoleInheritanceDefinition
} from './roleInheritance';

const hubRoles: RoleInheritanceDefinition[] = [
	{
		key: 'EditorChief',
		scopeType: 'hub',
		scopeId: 'journal-a',
		permissions: ['paper.accept'],
		inheritsFrom: ['AssociateEditor']
	},
	{
		key: 'AssociateEditor',
		scopeType: 'hub',
		scopeId: 'journal-a',
		permissions: ['paper.assignReviewers'],
		inheritsFrom: ['Reviewer']
	},
	{
		key: 'Reviewer',
		scopeType: 'hub',
		scopeId: 'journal-a',
		permissions: ['review.submit'],
		inheritsFrom: []
	}
];

describe('role hierarchy inheritance', () => {
	it('resolves inherited roles by key within a hub role map', () => {
		const rolesByKey = new Map(hubRoles.map((role) => [role.key, role]));

		expect(roleInheritsRole('EditorChief', 'Reviewer', rolesByKey)).toBe(true);
		expect(roleInheritsRole('AssociateEditor', 'Reviewer', rolesByKey)).toBe(true);
		expect(roleInheritsRole('Reviewer', 'AssociateEditor', rolesByKey)).toBe(false);
	});

	it('grants permissions through inherited roles in the same scope', () => {
		const rolesByScopeKey = new Map(hubRoles.map((role) => [getRoleDefinitionScopeKey(role), role]));

		expect(
			roleGrantsPermissionThroughHierarchy(hubRoles[0], 'review.submit', rolesByScopeKey)
		).toBe(true);
		expect(
			roleGrantsPermissionThroughHierarchy(hubRoles[1], 'paper.accept', rolesByScopeKey)
		).toBe(false);
	});

	it('does not leak inherited permissions across hub scopes', () => {
		const journalBReviewer: RoleInheritanceDefinition = {
			key: 'Reviewer',
			scopeType: 'hub',
			scopeId: 'journal-b',
			permissions: ['review.submit'],
			inheritsFrom: []
		};
		const rolesByScopeKey = new Map(
			[...hubRoles, journalBReviewer].map((role) => [getRoleDefinitionScopeKey(role), role])
		);
		const journalAAssociate = hubRoles[1];

		rolesByScopeKey.delete(getRoleDefinitionScopeKey(hubRoles[2]));

		expect(
			roleGrantsPermissionThroughHierarchy(journalAAssociate, 'review.submit', rolesByScopeKey)
		).toBe(false);
	});
});
