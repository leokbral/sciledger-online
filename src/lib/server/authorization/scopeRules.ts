export type ScopeType = 'global' | 'hub' | 'paper';

export type ScopedAssignment = {
	roleKey: string;
	scopeType: ScopeType;
	scopeId?: string | null;
	isActive?: boolean;
};

export type ScopedContext = {
	hubId?: string | null;
	paperId?: string | null;
};

export type RolePermissions = {
	key: string;
	permissions: string[];
	scopeType?: 'global' | 'hub';
	scopeId?: string | null;
	isActive?: boolean;
};

export function assignmentAppliesToContext(
	assignment: ScopedAssignment,
	context: ScopedContext
) {
	if (assignment.isActive === false) return false;
	if (assignment.scopeType === 'global') return true;
	if (assignment.scopeType === 'hub') return !!context.hubId && assignment.scopeId === context.hubId;
	if (assignment.scopeType === 'paper') {
		return !!context.paperId && assignment.scopeId === context.paperId;
	}
	return false;
}

export function resolvePermittedRoleKeys(
	assignments: ScopedAssignment[],
	roles: RolePermissions[],
	permission: string,
	context: ScopedContext
) {
	return roles
		.filter((role) => role.isActive !== false)
		.filter((role) =>
			assignments
				.filter((assignment) => assignmentAppliesToContext(assignment, context))
				.some((assignment) => {
					if (assignment.roleKey !== role.key) return false;
					if (assignment.scopeType === 'global') {
						return (role.scopeType ?? 'global') === 'global' && (role.scopeId ?? null) === null;
					}
					if (assignment.scopeType === 'hub') {
						return role.scopeType === 'hub' && role.scopeId === assignment.scopeId;
					}
					if (assignment.scopeType === 'paper') {
						return role.scopeType === 'hub' && role.scopeId === context.hubId;
					}
					return false;
				})
		)
		.filter((role) => role.permissions.includes(permission))
		.map((role) => role.key);
}

export function canTransitionFromExpectedStatus(
	currentStatus: string,
	expectedStatus: string,
	allowedPreviousStatuses: string[]
) {
	return currentStatus === expectedStatus && allowedPreviousStatuses.includes(expectedStatus);
}
