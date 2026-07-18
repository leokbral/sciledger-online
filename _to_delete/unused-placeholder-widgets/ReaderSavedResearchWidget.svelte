<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="Saved Research"
	description="Reading lists and saved papers will be connected next."
	tone="blue"
>
	<div id="reader-saved" class="space-y-4">
		<div class="flex items-center justify-between">
			<div class="text-2xl font-semibold text-surface-950">Soon</div>
			<span class="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
				Planned
			</span>
		</div>
		<div class="space-y-2">
			<div class="h-9 rounded-md bg-white/70"></div>
			<div class="h-9 rounded-md bg-white/70"></div>
			<div class="h-9 rounded-md bg-white/70"></div>
		</div>
	</div>
</DashboardCard>
