<script lang="ts">
	import DashboardCard from '$lib/components/Dashboard/DashboardCard.svelte';
</script>

<DashboardCard
	title="Topics"
	description="Knowledge areas and Hub topics will be grouped here."
	tone="emerald"
>
	<div id="reader-topics" class="space-y-4">
		<div class="text-2xl font-semibold text-surface-950">Browse</div>
		<div class="flex flex-wrap gap-2">
			<span class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-surface-600"
				>Open science</span
			>
			<span class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-surface-600"
				>Peer review</span
			>
			<span class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-surface-600"
				>Publishing</span
			>
		</div>
		<div class="h-2 rounded-full bg-emerald-100">
			<div class="h-full w-[58%] rounded-full bg-emerald-500"></div>
		</div>
	</div>
</DashboardCard>
