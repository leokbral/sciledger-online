<script lang="ts">
	import type { Snippet } from 'svelte';

	type GridVariant = 'kpi' | 'cards' | 'split';

	interface Props {
		variant?: GridVariant;
		class?: string;
		children?: Snippet;
	}

	let { variant = 'cards', class: className = '', children }: Props = $props();

	const gridClasses: Record<GridVariant, string> = {
		kpi: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
		cards: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
		split: 'grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]'
	};
</script>

<div class="{gridClasses[variant]} {className}">
	{@render children?.()}
</div>
