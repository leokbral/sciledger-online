<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
	import { hubHref } from '../../hubMetrics';
	import type { HubWorkspaceProps } from '../../hubTypes';
	import ReaderNavigation from './ReaderNavigation.svelte';
	import ReaderDiscoveryPage from './pages/ReaderDiscoveryPage.svelte';

	let { hub = null, hubs, metrics, loading, error, workspace, stats }: HubWorkspaceProps = $props();

	let baseHref = $derived(hubHref(hub));
	let hubTitle = $derived(hub?.title ?? 'this Hub');

	let kpis: Array<{ label: string; value: string }> = $derived([
		{ label: 'Published papers', value: String(metrics.published) },
		{ label: 'Visible papers', value: String(metrics.total) },
		{ label: 'Members', value: String(stats?.members ?? 0) }
	]);
</script>

<div class="space-y-9">
	<ReaderNavigation {baseHref} />

	<section class="space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold tracking-tight text-surface-950">
				What can you read in this Hub?
			</h2>
			<p class="mt-1 text-sm leading-6 text-surface-500">
				Published and visible research from {hubTitle}.
			</p>
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each kpis as kpi (kpi.label)}
				<DashboardCard label={kpi.label} title={kpi.value} compact />
			{/each}
		</div>
	</section>

	<ReaderDiscoveryPage {hubs} {loading} {error} {workspace} />
</div>
