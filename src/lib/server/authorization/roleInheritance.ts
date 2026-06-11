export type RoleInheritanceDefinition = {
	key: string;
	permissions?: string[];
	inheritsFrom?: string[];
	scopeType?: 'global' | 'hub' | string;
	scopeId?: string | null;
	isActive?: boolean;
};

export function getRoleScopeKey(
	scopeType: string,
	scopeId: string | null | undefined,
	roleKey: string
) {
	return `${scopeType}:${scopeId ?? ''}:${roleKey}`;
}

export function getRoleDefinitionScopeKey(role: RoleInheritanceDefinition) {
	return getRoleScopeKey(String(role.scopeType ?? 'global'), role.scopeId ?? null, String(role.key));
}

export function getInheritedRoleKeys(role: RoleInheritanceDefinition | null | undefined) {
	return Array.isArray(role?.inheritsFrom)
		? role.inheritsFrom.map((roleKey: unknown) => String(roleKey)).filter(Boolean)
		: [];
}

export function roleInheritsRole(
	roleKey: string,
	inheritedRoleKey: string,
	rolesByKey: Map<string, RoleInheritanceDefinition>,
	visited = new Set<string>()
): boolean {
	if (roleKey === inheritedRoleKey || visited.has(roleKey)) return false;
	visited.add(roleKey);

	const role = rolesByKey.get(roleKey);
	return getInheritedRoleKeys(role).some(
		(candidateRoleKey) =>
			candidateRoleKey === inheritedRoleKey ||
			roleInheritsRole(candidateRoleKey, inheritedRoleKey, rolesByKey, new Set(visited))
	);
}

export function roleGrantsPermissionThroughHierarchy(
	role: RoleInheritanceDefinition,
	permission: string,
	rolesByScopeKey: Map<string, RoleInheritanceDefinition>,
	visited = new Set<string>()
): boolean {
	const scopeKey = getRoleDefinitionScopeKey(role);
	if (visited.has(scopeKey) || role.isActive === false) return false;
	visited.add(scopeKey);

	if (Array.isArray(role.permissions) && role.permissions.includes(permission)) {
		return true;
	}

	return getInheritedRoleKeys(role).some((inheritedRoleKey) => {
		const inheritedRole = rolesByScopeKey.get(
			getRoleScopeKey(String(role.scopeType ?? 'global'), role.scopeId ?? null, inheritedRoleKey)
		);

		return (
			!!inheritedRole &&
			roleGrantsPermissionThroughHierarchy(
				inheritedRole,
				permission,
				rolesByScopeKey,
				new Set(visited)
			)
		);
	});
}
