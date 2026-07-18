<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
	import { hubHref } from '../../hubMetrics';
	import type { HubWorkspaceProps } from '../../hubTypes';
	import EditorNavigation from './EditorNavigation.svelte';
	import EditorOperationsPage from './pages/EditorOperationsPage.svelte';

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
	let hubTitle = $derived(hub?.title ?? 'this Hub');

	let kpis: Array<{ label: string; value: string }> = $derived([
		{ label: 'Manuscripts in review', value: String(metrics.underReview) },
		{ label: 'Waiting decisions', value: String(metrics.pending) },
		{ label: 'Published', value: String(metrics.published) },
		{ label: 'Active reviewers', value: String(stats?.reviewers ?? 0) },
		{ label: 'Pending invitations', value: String(stats?.pendingInvitations ?? 0) }
	]);
</script>

<div class="space-y-9">
	<EditorNavigation {baseHref} />

	<section class="space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold tracking-tight text-surface-950">
				What needs editorial attention?
			</h2>
			<p class="mt-1 text-sm leading-6 text-surface-500">
				Manuscripts, review coverage, and decisions for {hubTitle}.
			</p>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
			{#each kpis as kpi (kpi.label)}
				<DashboardCard label={kpi.label} title={kpi.value} compact />
			{/each}
		</div>
	</section>

	<EditorOperationsPage {hubs} {loading} {error} {workspace} />

	{#if management}
		{@render management()}
	{/if}
</div>
