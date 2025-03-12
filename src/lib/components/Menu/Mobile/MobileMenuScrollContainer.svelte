<script lang="ts">
	import type { Menuitem } from '../types';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	const btnHdl = (i: number) => {
		selected = i;
		menuContainer.scroll((selected - 1) * 80, 0);
		dispatch('btnHdl', {
			i
		});
	};


	interface Props {
		selected: number;
		menuContainer: HTMLDivElement;
		items: Menuitem[];
	}

	let { selected = $bindable(), menuContainer = $bindable(), items }: Props = $props();
</script>

<div
	class="ml-8 mr-8 snap-x scroll-px-4 snap-mandatory scroll-smooth flex gap-6 overflow-x-auto pt-0 pb-12 py-8 justify-center"
>
	<div
		bind:this={menuContainer}
		class="bg-transparent! snap-x snap-mandatory scroll-smooth flex pb-6 overflow-x-auto"
	>
		{#each items as item, i}
			<div id={`item-${i}`} class="bg-transparent! w-20 snap-start shrink-0">
				<button
					class:!preset-filled-primary-500={i === selected ? true : false}
					type="button"
					class="btn-icon btn-icon-lg bg-surface-100 text-4xl"
					onclick={() => btnHdl(i)}>{item.icon}</button
				>
			</div>
		{/each}
	</div>
</div>
