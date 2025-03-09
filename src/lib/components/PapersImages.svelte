<script lang="ts">
	interface PaperImage {
		id: number;
		name: string;
		imageUrl: string;
		description: string;
	}

	interface PaperImagesData {
		images: PaperImage[];
	}

	let elemPaperImages: HTMLDivElement;

	const paperImagesData: PaperImagesData = {
		images: [
			{
				id: 1,
				name: 'Research Methodology Diagram',
				imageUrl: 'https://placehold.co/600x400/png?text=Research+Diagram',
				description: 'Diagram showing the research methodology workflow'
			},
			{
				id: 2,
				name: 'Data Analysis Results',
				imageUrl: 'https://placehold.co/600x400/png?text=Data+Analysis',
				description: 'Graph showing key research findings'
			},
			{
				id: 3,
				name: 'Experimental Setup',
				imageUrl: 'https://placehold.co/600x400/png?text=Experiment+Setup',
				description: 'Laboratory setup for the experiment'
			},
			{
				id: 4,
				name: 'Results Comparison',
				imageUrl: 'https://placehold.co/600x400/png?text=Results+Chart',
				description: 'Comparative analysis of results'
			}
		]
	};

	const multiColumnLeft = (): void => {
		// elemPaperImages.scrollBy({ left: -300, behavior: 'smooth' });

		let x = elemPaperImages.scrollWidth;
		if (elemPaperImages.scrollLeft !== 0)
			x = elemPaperImages.scrollLeft - elemPaperImages.clientWidth;
		elemPaperImages.scroll(x, 0);
	};

	const multiColumnRight = (): void => {
		// elemPaperImages.scrollBy({ left: 300, behavior: 'smooth' });
		let x = 0;
		// -1 is used because different browsers use different methods to round scrollWidth pixels.
		if (elemPaperImages.scrollLeft < elemPaperImages.scrollWidth - elemPaperImages.clientWidth - 1)
			x = elemPaperImages.scrollLeft + elemPaperImages.clientWidth;
		elemPaperImages.scroll(x, 0);
	};
</script>

<section class="my-8">
	<h2 class="text-xl font-bold mb-4">Paper Images</h2>

	<div class="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
		<!-- Button: Left -->
		<button type="button" class="btn-icon variant-filled" on:click={multiColumnLeft}>
			<i class="fa-solid fa-arrow-left" />
		</button>

		<div bind:this={elemPaperImages} class="snap-x snap-mandatory scroll-smooth flex gap-4 pb-4 overflow-x-auto">
			{#each paperImagesData.images as image (image.id)}
				<div class="shrink-0 w-[300px] snap-start">
					<img
						class="rounded-lg shadow-lg hover:brightness-110 transition-all"
						src={image.imageUrl}
						alt={image.name}
						title={image.description}
						loading="lazy"
					/>
					<p class="mt-2 text-sm text-center">{image.name}</p>
				</div>
			{/each}
		</div>

		<!-- Button-Right -->
		<button type="button" class="btn-icon variant-filled" on:click={multiColumnRight}>
			<i class="fa-solid fa-arrow-right" />
		</button>
	</div>
</section>
