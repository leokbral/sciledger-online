<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { onMount } from 'svelte';

	import type { Menuitem } from '../types';
	import MobileMenuItemCard from './MobileMenuItemCard.svelte';

	let innerWidth: number = $state();
	let w: number;


	interface Props {
		selected: number;
		items: Menuitem[];
	}

	let { selected = $bindable(), items }: Props = $props();

	let len = items.length;

	let touchstartX = 0;
	let touchendX = 0;

	let menuContainer: HTMLDivElement = $state();

	const btnHdl = (i: number) => {
		selected = i;
		menuContainer.scroll(selected * w, 0);
	};

	function checkDirection() {
		if (touchendX < touchstartX - 40 && selected < len - 1) {
			multiColumnRight();
			selected = selected + 1;
		}

		if (touchendX > touchstartX + 40 && selected > 0) {
			multiColumnLeft();
			selected = selected - 1;
		}
	}

	function handleTouchStart(e: TouchEvent) {
		touchstartX = e.changedTouches[0].screenX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchendX = e.changedTouches[0].screenX;
		checkDirection();
	}

	function multiColumnLeft(): void {
		let x = menuContainer.scrollLeft;
		if (isOk2Sub()) {
			// x = menuContainer.scrollLeft - 88;
			x = menuContainer.scrollLeft - w - 8;
		}
		menuContainer.scroll(x, 0);
	}

	function multiColumnRight(): void {
		let x = menuContainer.scrollLeft; //0;
		// -1 is used because different browsers use different methods to round scrollWidth pixels.
		if (isOk2Add()) {
			// x = menuContainer.scrollLeft + 88;
			x = menuContainer.scrollLeft + w;
		}
		menuContainer.scroll(x, 0);
	}

	function setScrollX(selected: number): void {
		menuContainer.scroll(267 * selected, 0);
	}

	function isOk2Add() {
		console.log(selected, Math.round(menuContainer.scrollLeft / w));
		return (
			// menuContainer.scrollLeft / 80 <= selected &&
			menuContainer.scrollLeft / w <= selected &&
			selected <= len - 1 &&
			// selected === Math.floor((menuContainer.scrollLeft + menuContainer.clientWidth) / 80 - 1) &&
			selected === Math.floor((menuContainer.scrollLeft + menuContainer.clientWidth) / w - 1) &&
			menuContainer.scrollLeft < menuContainer.scrollWidth - menuContainer.clientWidth - 1
		);
	}

	function isOk2Sub() {
		console.log(selected, Math.round(menuContainer.scrollLeft / w));
		return (
			0 < selected &&
			selected <= len - 1 &&
			//selected === Math.round(menuContainer.scrollLeft / 80) &&
			selected === Math.round(menuContainer.scrollLeft / w) &&
			menuContainer.scrollLeft !== 0
		);
	}

	/* function keyPressHdl(
		event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
		i: number
	): any {
		btnHdl(i);
	} */

	onMount(() => {
		setScrollX(selected);
		console.log(innerWidth);
		w = innerWidth * 0.83;
	});
</script>

<svelte:window bind:innerWidth />
<div
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
	class="w-screen h-[calc(100svh_-_80px)] bg-surface-900 p-0 grid grid-cols-[1fr] gap-4 items-center"
>
	<!-- Full Images -->
	<!-- <div bind:this={menuContainer} class="snap-x snap-mandatory scroll-smooth flex overflow-x-hidden bg-[url('/images/bg.png')] bg-cover"> -->
	<div class="red w-screen h-screen overflow-hidden z-1 absolute">
		<video autoplay loop muted class="absolute top-0 left-0 min-h-full inset-0 object-cover">
			<source type="video/webm" src={'/v.mkv'} />
		</video>
	</div>
	<div
		bind:this={menuContainer}
		class="snap-x snap-mandatory scroll-smooth flex overflow-x-hidden z-2 items-start"
	>
		{#each items as item, i}
			<div
				id={`item-${i}`}
				class="bg-transparent! w-10/12 snap-center shrink-0 rounded-container flex items-center"
				role="button"
				tabindex="0"
				onclick={() => btnHdl(i)}
				onkeypress={bubble('keypress')}
			>
				<div class="flex flex-col justify-center items-center gap-4">
					<div class="w-1/2">
						<img
							height="120"
							class="snap-center rounded-container"
							src="/images/chibi-{i}.png"
							alt={'tori'}
							loading="lazy"
						/>
					</div>
					<MobileMenuItemCard {item} />
				</div>
				<!-- </div> -->
			</div>
		{/each}
	</div>
</div>

<style>
	.red {
		outline: solid red;
	}
</style>
