<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
	import { hubHref } from '../../hubMetrics';
	import type { HubWorkspaceProps } from '../../hubTypes';
	import AuthorNavigation from './AuthorNavigation.svelte';
	import AuthorSubmissionsPage from './pages/AuthorSubmissionsPage.svelte';

	let { hub = null, hubs, metrics, loading, error, workspace }: HubWorkspaceProps = $props();

	let baseHref = $derived(hubHref(hub));
	let hubTitle = $derived(hub?.title ?? 'this Hub');

	let kpis: Array<{ label: string; value: string }> = $derived([
		{ label: 'Active submissions', value: String(metrics.active) },
		{ label: 'Under review', value: String(metrics.underReview) },
		{ label: 'Revisions requested', value: String(metrics.corrections) },
		{ label: 'Published', value: String(metrics.published) }
	]);
</script>

<div class="space-y-9">
	<AuthorNavigation {baseHref} />

	<section class="space-y-5">
		<div class="max-w-3xl">
			<h2 class="text-xl font-semibold tracking-tight text-surface-950">
				How are your manuscripts progressing?
			</h2>
			<p class="mt-1 text-sm leading-6 text-surface-500">
				Submission progress for manuscripts connected to {hubTitle}.
			</p>
		</div>
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{#each kpis as kpi (kpi.label)}
				<DashboardCard label={kpi.label} title={kpi.value} compact />
			{/each}
		</div>
	</section>

	<AuthorSubmissionsPage {hubs} {loading} {error} {workspace} />
</div>
