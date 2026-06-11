export type RoleAssignmentLike = {
	roleKey?: string | null;
	roleName?: string | null;
	name?: string | null;
	label?: string | null;
	priority?: number | null;
	isActive?: boolean;
};

export type RoleDisplayConfig = {
	label: string;
	priority: number;
	icon: string;
	badgeClass: string;
};

export const ROLE_HIERARCHY = [
	'HubOwner',
	'EditorChief',
	'AssociateEditor',
	'Reviewer',
	'Author'
] as const;

const ROLE_DISPLAY_ALIASES: Record<string, string> = {
	ManagingEditor: 'EditorChief'
};

export const DEFAULT_ROLE_DISPLAY_CONFIG: Record<string, RoleDisplayConfig> = {
	HubOwner: {
		label: 'Hub Owner',
		priority: 100,
		icon: '',
		badgeClass: 'border-amber-300 bg-amber-50 text-amber-900'
	},
	EditorChief: {
		label: 'Editor Chief',
		priority: 90,
		icon: '',
		badgeClass: 'border-slate-300 bg-slate-100 text-slate-800'
	},
	AssociateEditor: {
		label: 'Associate Editor',
		priority: 70,
		icon: '',
		badgeClass: 'border-orange-300 bg-orange-50 text-orange-900'
	},
	Reviewer: {
		label: 'Reviewer',
		priority: 20,
		icon: '',
		badgeClass: 'border-blue-200 bg-blue-50 text-blue-900'
	},
	Author: {
		label: 'Author',
		priority: 10,
		icon: '',
		badgeClass: 'border-slate-200 bg-slate-50 text-slate-700'
	}
};

export function getDisplayRoleKey(roleKey: string | null | undefined) {
	if (!roleKey) return null;
	return ROLE_DISPLAY_ALIASES[roleKey] ?? roleKey;
}

export function getRoleLabel(roleKey: string | null | undefined) {
	const displayRoleKey = getDisplayRoleKey(roleKey);
	if (!displayRoleKey) return 'Member';
	return DEFAULT_ROLE_DISPLAY_CONFIG[displayRoleKey]?.label ?? displayRoleKey;
}

export function getRolePriority(roleKey: string | null | undefined) {
	const displayRoleKey = getDisplayRoleKey(roleKey);
	if (!displayRoleKey) return Number.NEGATIVE_INFINITY;
	return DEFAULT_ROLE_DISPLAY_CONFIG[displayRoleKey]?.priority ?? 0;
}

export function getRoleIcon(roleKey: string | null | undefined) {
	const displayRoleKey = getDisplayRoleKey(roleKey);
	if (!displayRoleKey) return '';
	return DEFAULT_ROLE_DISPLAY_CONFIG[displayRoleKey]?.icon ?? '';
}

export function getRoleBadgeClass(roleKey: string | null | undefined) {
	const displayRoleKey = getDisplayRoleKey(roleKey);
	return (
		DEFAULT_ROLE_DISPLAY_CONFIG[displayRoleKey ?? '']?.badgeClass ??
		'border-surface-200 bg-surface-50 text-surface-700'
	);
}

export function getRoleDisplay(roleKey: string | null | undefined, overrides?: Partial<RoleDisplayConfig>) {
	const displayRoleKey = getDisplayRoleKey(roleKey);
	return {
		key: displayRoleKey ?? null,
		label: overrides?.label ?? getRoleLabel(displayRoleKey),
		priority: overrides?.priority ?? getRolePriority(displayRoleKey),
		icon: getRoleIcon(displayRoleKey),
		badgeClass: getRoleBadgeClass(displayRoleKey)
	};
}

export function sortRoleKeysByDisplayPriority(roleKeys: string[]) {
	return [...roleKeys].sort((left, right) => {
		const priorityDifference = getRolePriority(right) - getRolePriority(left);
		return priorityDifference || getRoleLabel(left).localeCompare(getRoleLabel(right));
	});
}

export function getDisplayRoles(assignments: RoleAssignmentLike[]) {
	const rolesByKey = new Map<string, ReturnType<typeof getRoleDisplay>>();

	for (const assignment of assignments) {
		if (assignment?.isActive === false || !assignment?.roleKey) continue;

		const rawRoleKey = String(assignment.roleKey);
		const roleKey = getDisplayRoleKey(rawRoleKey) ?? rawRoleKey;
		const defaultPriority = getRolePriority(roleKey);
		const isStandardRole = roleKey in DEFAULT_ROLE_DISPLAY_CONFIG;
		const priority = isStandardRole
			? defaultPriority
			: typeof assignment.priority === 'number' &&
				  (assignment.priority !== 0 || defaultPriority === 0)
				? assignment.priority
				: defaultPriority;
		const role = getRoleDisplay(roleKey, {
			label:
				rawRoleKey === roleKey
					? assignment.label ?? assignment.roleName ?? assignment.name ?? getRoleLabel(roleKey)
					: getRoleLabel(roleKey),
			priority
		});
		const existing = rolesByKey.get(roleKey);

		if (!existing || role.priority > existing.priority) {
			rolesByKey.set(roleKey, role);
		}
	}

	return [...rolesByKey.values()].sort((left, right) => {
		const priorityDifference = right.priority - left.priority;
		return priorityDifference || left.label.localeCompare(right.label);
	});
}

export function getPrimaryRole(assignments: RoleAssignmentLike[]) {
	return getDisplayRoles(assignments)[0]?.key ?? null;
}

export const getHighestRole = getPrimaryRole;

export function getSecondaryRoles(assignments: RoleAssignmentLike[]) {
	const primaryRole = getPrimaryRole(assignments);
	return getDisplayRoles(assignments)
		.map((role) => role.key)
		.filter((roleKey): roleKey is string => !!roleKey && roleKey !== primaryRole);
}
