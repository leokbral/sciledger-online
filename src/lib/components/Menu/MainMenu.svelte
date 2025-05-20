<script lang="ts">
	import DesktopMainMenu from './Desktop/DesktopMainMenu.svelte';
	import MobileMainMenu from './Mobile/MobileMainMenu.svelte';
	import type { Menuitem } from './types';

	interface Props {
		items: Menuitem[];
		selected: number;
	}

	let { items, selected }: Props = $props();

	let innerWidth: number = $state();
</script>

<svelte:window bind:innerWidth />

{#if innerWidth > 768}
	<DesktopMainMenu {items} {selected} />
{:else}
	<MobileMainMenu {items} {selected} />
{/if}
