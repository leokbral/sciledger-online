<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';

	interface Props {
		active: number;
	}

	let { active }: Props = $props();
</script>

<DashboardCard
	title="Decision Flow"
	description="Decision-ready manuscripts will appear here."
	tone="primary"
>
	<div id="editor-decisions" class="space-y-4">
		<div class="flex items-end justify-between">
			<div>
				<div class="text-3xl font-semibold text-surface-950">{active}</div>
				<div class="text-sm font-medium text-surface-500">active manuscripts</div>
			</div>
			<span class="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
				Reviewing
			</span>
		</div>
		<div class="grid grid-cols-3 gap-2">
			<div class="h-16 rounded-md bg-primary-100"></div>
			<div class="h-16 rounded-md bg-primary-200"></div>
			<div class="h-16 rounded-md bg-primary-300"></div>
		</div>
	</div>
</DashboardCard>
