<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="Expertise Match"
	description="Topic and Hub matching will be added as reviewer widgets mature."
	tone="emerald"
>
	<div id="reviewer-preferences" class="space-y-4">
		<div class="flex items-center justify-between">
			<div class="text-2xl font-semibold text-surface-950">Profile</div>
			<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
				Matched
			</span>
		</div>
		<div class="space-y-3">
			<div>
				<div class="mb-1 flex justify-between text-xs font-medium text-surface-600">
					<span>Topic fit</span>
					<span>84%</span>
				</div>
				<div class="h-2 rounded-full bg-emerald-100">
					<div class="h-full w-[84%] rounded-full bg-emerald-500"></div>
				</div>
			</div>
			<div>
				<div class="mb-1 flex justify-between text-xs font-medium text-surface-600">
					<span>Capacity</span>
					<span>62%</span>
				</div>
				<div class="h-2 rounded-full bg-emerald-100">
					<div class="h-full w-[62%] rounded-full bg-emerald-400"></div>
				</div>
			</div>
		</div>
	</div>
</DashboardCard>
