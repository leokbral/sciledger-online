<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="Governance Queue"
	description="Role and access events will be surfaced here."
	tone="primary"
>
	<div class="space-y-4">
		<div class="flex items-end justify-between">
			<div class="text-3xl font-semibold text-surface-950">Ready</div>
			<span class="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
				0 blocked
			</span>
		</div>
		<div class="space-y-2">
			<div class="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-sm">
				<span class="font-medium text-surface-700">Role changes</span>
				<span class="font-semibold text-surface-950">Queued</span>
			</div>
			<div class="flex items-center justify-between rounded-md bg-white/70 px-3 py-2 text-sm">
				<span class="font-medium text-surface-700">Policy checks</span>
				<span class="font-semibold text-emerald-700">Clear</span>
			</div>
		</div>
	</div>
</DashboardCard>
