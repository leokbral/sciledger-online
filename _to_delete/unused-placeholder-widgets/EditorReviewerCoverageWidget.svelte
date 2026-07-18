<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="Reviewer Coverage"
	description="Coverage gaps and pending invitations will be connected next."
	tone="blue"
>
	<div class="space-y-4">
		<div class="text-2xl font-semibold text-surface-950">Planned</div>
		<div class="space-y-3">
			<div>
				<div class="mb-1 flex justify-between text-xs font-medium text-surface-600">
					<span>Reviewer fit</span>
					<span>74%</span>
				</div>
				<div class="h-2 rounded-full bg-blue-100">
					<div class="h-full w-[74%] rounded-full bg-blue-500"></div>
				</div>
			</div>
			<div>
				<div class="mb-1 flex justify-between text-xs font-medium text-surface-600">
					<span>Response coverage</span>
					<span>58%</span>
				</div>
				<div class="h-2 rounded-full bg-blue-100">
					<div class="h-full w-[58%] rounded-full bg-blue-400"></div>
				</div>
			</div>
		</div>
	</div>
</DashboardCard>
