<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';

	interface Props {
		papers: number;
	}

	let { papers }: Props = $props();
</script>

<DashboardCard
	title="Publication Readiness"
	description="Template, policy and payment readiness will be connected as widgets mature."
	tone="blue"
>
	<div id="author-readiness" class="space-y-4">
		<div class="flex items-end justify-between gap-3">
			<div>
				<div class="text-3xl font-semibold text-surface-950">{papers}</div>
				<div class="text-sm font-medium text-surface-500">papers in scope</div>
			</div>
			<span class="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
				Preparing
			</span>
		</div>
		<div>
			<div class="mb-1 flex justify-between text-xs font-medium text-surface-600">
				<span>Readiness score</span>
				<span>68%</span>
			</div>
			<div class="h-2 rounded-full bg-blue-100">
				<div class="h-full w-[68%] rounded-full bg-blue-500"></div>
			</div>
		</div>
		<div class="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-surface-600">
			<div class="rounded-md bg-white/70 px-2 py-2">Files</div>
			<div class="rounded-md bg-white/70 px-2 py-2">Policy</div>
			<div class="rounded-md bg-white/70 px-2 py-2">Review</div>
		</div>
	</div>
</DashboardCard>
