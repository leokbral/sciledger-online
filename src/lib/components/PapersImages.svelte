<script lang="ts">
	import Icon from "@iconify/svelte";

	const { images } = $props();

	interface PaperImage {
		id: number;
		imageUrl: string;
	}

	let elemPaperImages = $state<HTMLDivElement | undefined>(undefined);

	const multiColumnLeft = (): void => {
		// elemPaperImages.scrollBy({ left: -300, behavior: 'smooth' });
		if (elemPaperImages) {
			let x = elemPaperImages?.scrollWidth;
			if (elemPaperImages?.scrollLeft !== 0)
				x = elemPaperImages.scrollLeft - elemPaperImages.clientWidth;
			elemPaperImages.scroll(x, 0);
		}
	};

	const multiColumnRight = (): void => {
		// elemPaperImages.scrollBy({ left: 300, behavior: 'smooth' });
		let x = 0;
		if (elemPaperImages) {
			// -1 is used because different browsers use different methods to round scrollWidth pixels.
			if (
				elemPaperImages.scrollLeft <
				elemPaperImages.scrollWidth - elemPaperImages.clientWidth - 1
			)
				x = elemPaperImages.scrollLeft + elemPaperImages.clientWidth;
			elemPaperImages.scroll(x, 0);
		}
	};
</script>

<section class="my-8">
	<h2 class="text-xl font-bold mb-4">Paper Images</h2>

	<div class="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
		<!-- Button: Left -->
		<button
			type="button"
			class="btn-icon preset-filled"
			onclick={multiColumnLeft}
			aria-label="Scroll Left"
		>
			<!-- <i class="fa-solid fa-arrow-left"></i> -->
			<Icon icon="weui:back-filled" width="12" height="24" />
		</button>

		<div
			bind:this={elemPaperImages}
			class="snap-x snap-mandatory scroll-smooth flex gap-4 pb-4 overflow-x-auto"
		>
			{#if images && images.length > 0}
				{#each images as imageId, index (index)}
					<div class="shrink-0 w-[300px] snap-start">
						<img
							class="rounded-lg shadow-lg hover:brightness-110 transition-all"
							src={`/api/images/${imageId}`}
							alt={`Paper image ${index + 1}`}
							loading="lazy"
						/>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Button-Right -->
		<button
			type="button"
			class="btn-icon preset-filled"
			onclick={multiColumnRight}
			aria-label="Scroll Right"
		>
			<!-- <i class="fa-solid fa-arrow-right"></i> -->
			 <Icon icon="weui:arrow-filled" width="12" height="24" />
		</button>
	</div>
</section>
