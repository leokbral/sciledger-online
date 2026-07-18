<script lang="ts">
	import type { DashboardActivityPlaceholder } from '$lib/components/Dashboard/types';

	interface Props {
		title?: string;
		description?: string;
		items: DashboardActivityPlaceholder[];
	}

	let { title = 'Recent Activity', description, items }: Props = $props();
</script>

<section class="rounded-lg border border-surface-200 bg-white p-5 shadow-sm">
	<div class="mb-5 flex items-start justify-between gap-4">
		<div>
			<h2 class="text-base font-semibold text-surface-950">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm leading-relaxed text-surface-600">{description}</p>
			{/if}
		</div>
	</div>
	{#if items.length > 0}
		<div class="space-y-1">
			{#each items as item, index (index)}
				<div
					class="group grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg px-2 py-3 transition hover:bg-surface-50"
				>
					<span class="mt-1.5 h-2 w-2 rounded-full bg-primary-400"></span>
					<div>
						<p class="text-sm font-medium text-surface-950">{item.title}</p>
						<p class="mt-0.5 text-xs leading-relaxed text-surface-500">{item.description}</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-surface-500">No recent activity yet.</p>
	{/if}
</section>
