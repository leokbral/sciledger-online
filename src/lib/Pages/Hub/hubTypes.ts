import type { Snippet } from 'svelte';
import type { DashboardRole, DashboardUser } from '$lib/components/Dashboard/types';

export type HubSummary = {
	_id?: string;
	id?: string;
	title?: string;
	type?: string;
	description?: string;
	status?: string;
	logoUrl?: string;
	cardUrl?: string;
	bannerUrl?: string;
	location?: string;
	issn?: string;
	guidelinesUrl?: string;
	hubRole?: HubRoleContext;
	currentUserHubRole?: HubRoleContext;
	currentUserRole?: HubRoleContext;
	viewerRole?: HubRoleContext;
	currentUserHubMember?: HubRoleContext;
	createdAt?: string;
	[key: string]: any;
};

export type HubMetrics = {
	hubs: number;
	papers: number;
	total: number;
	drafts: number;
	inReview: number;
	underReview: number;
	active: number;
	corrections: number;
	pending: number;
	accepted: number;
	rejected: number;
	published: number;
	reviews: number;
	acceptanceRate: number | null;
};

export type HubStats = {
	members: number;
	owners: number;
	editors: number;
	reviewers: number;
	pendingInvitations: number;
};

export type HubRoleContext =
	| string
	| {
			key?: string | null;
			roleKey?: string | null;
			name?: string | null;
			label?: string | null;
			primaryRoleKey?: string | null;
			directRoleKeys?: string[] | null;
			roles?: HubRoleContext[] | null;
			canManageRoles?: boolean | null;
			canManageHub?: boolean | null;
			canAssignReviewers?: boolean | null;
			canReview?: boolean | null;
			canSubmit?: boolean | null;
	  }
	| null
	| undefined;

export type HubWorkspaceNavItem = {
	label: string;
	href?: string;
	active?: boolean;
	action?: 'members';
};

export type HubWorkspaceProps = {
	user: DashboardUser;
	hub?: HubSummary | null;
	hubRoleLabel?: string;
	hubs: HubSummary[];
	papers: Record<string, any>[];
	reviews: Record<string, any>[];
	metrics: HubMetrics;
	loading: boolean;
	error: string | null;
	workspace?: Snippet;
	members?: Snippet;
	management?: Snippet;
	details?: Snippet;
	stats?: HubStats;
};

export type HubWorkspaceResolution = {
	role: DashboardRole;
	label: string;
	roleKey: string | null;
};
