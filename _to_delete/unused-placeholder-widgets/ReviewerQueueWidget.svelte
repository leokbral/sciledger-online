<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';

	interface Props {
		reviews: number;
	}

	let { reviews }: Props = $props();
</script>

<DashboardCard
	title="Review Queue"
	description="Assignments and invitations will connect here."
	tone="primary"
>
	<div id="reviewer-queue" class="space-y-4">
		<div class="flex items-end justify-between">
			<div class="text-4xl font-semibold text-surface-950">{reviews}</div>
			<span class="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
				Queue
			</span>
		</div>
		<div class="rounded-lg bg-white/70 p-3">
			<div class="mb-2 flex justify-between text-xs font-semibold text-surface-500">
				<span>Completion readiness</span>
				<span>71%</span>
			</div>
			<div class="h-2 rounded-full bg-primary-100">
				<div class="h-full w-[71%] rounded-full bg-primary-500"></div>
			</div>
		</div>
	</div>
</DashboardCard>
