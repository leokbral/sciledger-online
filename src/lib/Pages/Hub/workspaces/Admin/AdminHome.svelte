<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
	import DashboardQuickActions from '$lib/components/Dashboard/DashboardQuickActions.svelte';
	import { type DashboardQuickAction } from '$lib/components/Dashboard/types';
	import { hubHref, hubId } from '../../hubMetrics';
	import type { HubWorkspaceProps } from '../../hubTypes';
	import AdminNavigation from './AdminNavigation.svelte';
	import AdminOperationsPage from './pages/AdminOperationsPage.svelte';

	let {
		hub = null,
		hubs,
		metrics,
		loading,
		error,
		management,
		workspace,
		stats
	}: HubWorkspaceProps = $props();

	let baseHref = $derived(hubHref(hub));
	let selectedHubId = $derived(hubId(hub));
	let hubTitle = $derived(hub?.title ?? 'this Hub');

	let actions = $derived([
		{
			label: 'Manage Roles',
			description: 'Review Hub access and credentials.',
			icon: 'shield',
			href: `${baseHref}/rbac`
		},
		{
			label: 'Invitations',
			description: 'Coordinate reviewer outreach.',
			icon: 'inbox',
			href: `${baseHref}/reviewer-invites`
		},
		{
			label: 'Edit Hub',
			description: 'Update identity and publication settings.',
			icon: 'settings',
			href: selectedHubId ? `/hub/edit/${selectedHubId}` : baseHref
		}
	] satisfies DashboardQuickAction[]);

	let kpis: Array<{ label: string; value: string }> = $derived([
		{ label: 'Total manuscripts', value: String(metrics.total) },
		{ label: 'Active reviews', value: String(metrics.underReview) },
		{ label: 'Published', value: String(metrics.published) },
		{ label: 'Pending invitations', value: String(stats?.pendingInvitations ?? 0) },
		{ label: 'Editors', value: String(stats?.editors ?? 0) },
		{ label: 'Reviewers', value: String(stats?.reviewers ?? 0) }
	]);
</script>

<div class="space-y-9">
	<AdminNavigation {baseHref} />

	<section class="space-y-5">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="max-w-3xl">
				<h2 class="text-xl font-semibold tracking-tight text-surface-950">
					What is happening inside this Hub?
				</h2>
				<p class="mt-1 text-sm leading-6 text-surface-500">
					Editorial activity, people, and controls in {hubTitle}.
				</p>
			</div>
			<DashboardQuickActions {actions} />
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
			{#each kpis as kpi (kpi.label)}
				<DashboardCard label={kpi.label} title={kpi.value} compact />
			{/each}
		</div>
	</section>

	<AdminOperationsPage {hubs} {loading} {error} {workspace} />

	{#if management}
		{@render management()}
	{/if}
</div>
