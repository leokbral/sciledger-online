<script lang="ts">
	import DesktopMainMenu from './Desktop/DesktopMainMenu.svelte';
	import MobileMainMenu from './Mobile/MobileMainMenu.svelte';
	import type { Menuitem } from './types';

	export let items: Menuitem[];
	export let selected: number;

	let innerWidth: number;
</script>

<svelte:window bind:innerWidth />

{#if innerWidth > 768}
	<DesktopMainMenu {items} {selected} />
{:else}
	<MobileMainMenu {items} {selected} />
{/if}
