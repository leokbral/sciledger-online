<script lang="ts">
	export let highlights: { icon: string; value: number; isInactive?: boolean }[];
</script>

<div class="flex text-surface-900-50-token">
	{#each highlights as highlight}
		<div
			class="chip"
			class:grayscale={highlight.isInactive}
			class:text-gray-400={highlight.isInactive}
		>
			<span class="text-2xl">{highlight.icon}</span>
			<span class="text-xl">{highlight.value}</span>
		</div>
	{/each}
</div>
