<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="System Notices"
	description="Platform alerts and release notes will live here."
	tone="blue"
>
	<div class="space-y-4">
		<div class="flex items-baseline gap-2">
			<div class="text-3xl font-semibold text-surface-950">0</div>
			<div class="text-sm font-medium text-surface-500">open notices</div>
		</div>
		<div class="rounded-lg border border-blue-100 bg-white/70 p-3">
			<div class="mb-2 flex items-center justify-between text-xs font-semibold text-surface-500">
				<span>Release readiness</span>
				<span>92%</span>
			</div>
			<div class="h-2 rounded-full bg-blue-100">
				<div class="h-full w-[92%] rounded-full bg-blue-500"></div>
			</div>
		</div>
	</div>
</DashboardCard>
