<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Menuitem } from '../types';

	interface Props {
		videoSource: string;
		items: Menuitem[];
	}

	let { videoSource, items }: Props = $props();
	let innerWidth: number = $state();

	const dispatch = createEventDispatcher();

	function hdlClick(item: any) {
		dispatch('Menu', {
			item
		});
	}
</script>

<svelte:window bind:innerWidth />
<!-- <div
	class="w-screen h-[calc(100svh_-_80px)] bg-surface-900 p-0 grid grid-cols-[1fr] gap-4 items-center"
> -->
<div class="w-screen bg-surface-900 p-0 grid grid-cols-[1fr] gap-4 items-center">
	<!-- <div class="red w-screen h-screen overflow-hidden z-1 absolute">
		<video autoplay loop muted class="absolute top-0 left-0 min-h-full inset-0 object-cover">
			<source type="video/webm" src={'/v.mkv'} />
		</video>
	</div> -->
	<div class="w-screen h-screen overflow-hidden z-1 absolute">
		<video
			autoplay
			loop
			muted
			class="absolute top-0 left-0 min-w-full min-h-full inset-0 object-cover"
		>
			<source type="video/webm" src={videoSource} />
		</video>
	</div>
	<div class="m-auto p-10 flex flex-col justify-center items-center lg:gap-3 z-[2] md:ml-2">
		{#each items as item, i}
			<!-- <a href="/{item.name}"> -->

			<!-- 	<span
				on:click={hdlClick(item)}
				use:popup={{
					event: 'click',
					target: 'boringMenu-' + i,
					placement: 'bottom',
					closeQuery: '#will-close'
				}}
				class="w-56 px-8 py-3 m-1 text-xl chip rounded-lg variant-filled-primary font-Valorant hover:bg-primary-900"
			>
				<span class:grayscale={item.notReady}>
					{item.notReady ? item.name + ' 🔒' : item.name}</span
				>
				
			</span> -->
			<button
				onclick={() => hdlClick(item)}
				class="w-56 px-8 py-3 m-1 text-xl chip rounded-lg preset-filled-primary-500 font-Valorant hover:bg-primary-900"
			>
				<span class:grayscale={item.notReady}>
					{item.notReady ? item.name + ' 🔒' : item.name}</span
				>
			</button>
			<!-- </a> -->
		{/each}
	</div>
</div>
