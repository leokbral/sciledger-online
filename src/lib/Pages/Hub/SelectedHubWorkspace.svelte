<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DashboardUser } from '$lib/components/Dashboard/types';
	import { getHubMetrics } from './hubMetrics';
	import { resolveHubWorkspaceForHub } from './hubResolver';
	import type { HubRoleContext, HubStats, HubSummary } from './hubTypes';
	import AdminWorkspace from './workspaces/Admin/AdminWorkspace.svelte';
	import AuthorWorkspace from './workspaces/Author/AuthorWorkspace.svelte';
	import EditorWorkspace from './workspaces/Editor/EditorWorkspace.svelte';
	import ReaderWorkspace from './workspaces/Reader/ReaderWorkspace.svelte';
	import ReviewerWorkspace from './workspaces/Reviewer/ReviewerWorkspace.svelte';

	interface Props {
		user: DashboardUser;
		hub: HubSummary;
		currentUserHubMember?: HubRoleContext;
		papers?: Record<string, any>[];
		reviews?: Record<string, any>[];
		details?: Snippet;
		members?: Snippet;
		management?: Snippet;
		workspace?: Snippet;
		stats?: HubStats;
	}

	let {
		user,
		hub,
		currentUserHubMember,
		papers = [],
		reviews = [],
		details,
		members,
		management,
		workspace,
		stats
	}: Props = $props();

	let contextualHub = $derived({
		...hub,
		currentUserHubMember: currentUserHubMember ?? hub.currentUserHubMember
	} satisfies HubSummary);
	let hubs = $derived([contextualHub]);
	let metrics = $derived(getHubMetrics(hubs, papers, reviews));
	let resolution = $derived(resolveHubWorkspaceForHub(contextualHub, currentUserHubMember));
	const loading = false;
	const error = null;
</script>

{#if resolution.role === 'admin'}
	<AdminWorkspace
		{user}
		hub={contextualHub}
		hubRoleLabel={resolution.label}
		{hubs}
		{papers}
		{reviews}
		{metrics}
		{loading}
		{error}
		{details}
		{members}
		{management}
		{workspace}
		{stats}
	/>
{:else if resolution.role === 'editor'}
	<EditorWorkspace
		{user}
		hub={contextualHub}
		hubRoleLabel={resolution.label}
		{hubs}
		{papers}
		{reviews}
		{metrics}
		{loading}
		{error}
		{details}
		{members}
		{management}
		{workspace}
		{stats}
	/>
{:else if resolution.role === 'reviewer'}
	<ReviewerWorkspace
		{user}
		hub={contextualHub}
		hubRoleLabel={resolution.label}
		{hubs}
		{papers}
		{reviews}
		{metrics}
		{loading}
		{error}
		{details}
		{workspace}
		{stats}
	/>
{:else if resolution.role === 'author'}
	<AuthorWorkspace
		{user}
		hub={contextualHub}
		hubRoleLabel={resolution.label}
		{hubs}
		{papers}
		{reviews}
		{metrics}
		{loading}
		{error}
		{details}
		{workspace}
		{stats}
	/>
{:else}
	<ReaderWorkspace
		{user}
		hub={contextualHub}
		hubRoleLabel={resolution.label}
		{hubs}
		{papers}
		{reviews}
		{metrics}
		{loading}
		{error}
		{details}
		{workspace}
		{stats}
	/>
{/if}
