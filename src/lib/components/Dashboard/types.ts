export type DashboardRole = 'admin' | 'editor' | 'reviewer' | 'author' | 'reader';

export type DashboardRoleFlags = {
	admin?: boolean;
	editor?: boolean;
	reviewer?: boolean;
	author?: boolean;
};

export type DashboardUser = {
	firstName?: string | null;
	lastName?: string | null;
	username?: string | null;
	email?: string | null;
	roles?: DashboardRoleFlags | null;
};

export type DashboardTone = 'primary' | 'blue' | 'emerald' | 'amber' | 'slate';

export type DashboardKpiPlaceholder = {
	label: string;
	hint: string;
	tone?: DashboardTone;
};

export type DashboardActivityPlaceholder = {
	title: string;
	description: string;
};

export type DashboardActionIcon =
	| 'activity'
	| 'book'
	| 'clipboard'
	| 'file'
	| 'inbox'
	| 'plus'
	| 'search'
	| 'settings'
	| 'shield'
	| 'users';

export type DashboardQuickAction = {
	label: string;
	description: string;
	icon: DashboardActionIcon;
	href?: string;
	disabled?: boolean;
};

export function getDashboardDisplayName(user: DashboardUser | null | undefined) {
	const fullName = [user?.firstName, user?.lastName]
		.map((part) => String(part ?? '').trim())
		.filter(Boolean)
		.join(' ');

	return fullName || user?.username || user?.email || 'there';
}
