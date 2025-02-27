<script lang="ts">
	import MenuItemCard from '../MenuItemCard.svelte';
	import type { Menuitem } from '../types';

	export let selected: number;

	export let items: Menuitem[];

	let menuContainer: HTMLDivElement;

	const btnHdl = (i: number) => {
		selected = i;
		menuContainer.scroll(0, (selected - 1) * 124);
	};
</script>

<div class="flex flex-row bg-surface-700">
	<div class="w-96 m-0 px-18 py-36">
		<div
			bind:this={menuContainer}
			class="h-[calc(100vh-288px)] flex flex-col gap-16 scroll-smooth overflow-auto"
		>
			{#each items as item, i}
				<div id={`item-${i}`} class="items-center flex flex-col">
					<button
						class:variant-filled-primary={i === selected ? true : false}
						type="button"
						class="btn btn-xl variant-filled"
						on:click={() => btnHdl(i)}>{item.icon} {item.name}</button
					>
				</div>
			{/each}
		</div>
	</div>

	<div
		class="flex flex-col flex-1 justify-center items-center overflow-y-auto"
		style="background-image: url({items[selected].img.src});  background-size: cover;
background-repeat: no-repeat; background-position: center center;"
	>
		<MenuItemCard {selected} {items} />
		<!-- <p class="text-9xl">{items[selected].icon}</p>
		<br />
		<a href="/{items[selected].name}"
			><span class="px-8 py-3 m-1 text-xl chip variant-filled hover:bg-primary-400">Jogar</span></a
		> -->

		<!-- <img
			alt="AulaZero Logo"
			src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/azr-bg-transparent.svg"
		/> -->
		<slot />
	</div>
</div>
