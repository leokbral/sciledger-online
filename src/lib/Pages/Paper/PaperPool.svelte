<script lang="ts">

	

	// import { type ModalSettings } from '@skeletonlabs/skeleton-svelte';
	import Abstract from '$lib/components/hope/Abstract.svelte';
	import PaperList from '$lib/PaperList/index.svelte';
	import type { Paper } from '$lib/types/Paper';
	import { writable } from 'svelte/store';
	interface Props {
		papersData: any;
		rota?: string;
		user: any;
	}

	let { papersData, rota = '', user }: Props = $props();
	// const modalStore = getModalStore();
	const papers: Paper[] = papersData.papersData[0];
	console.log(papers);

	let tabSet: number = 0;

	// ------------------------FILTROS------------------------
	// Stores para os filtros
	const minPrice = writable<number | null>(null);
	const maxPrice = writable<number | null>(null);
	const numberOfReviewers = writable<number | null>(null);

	// Função para aplicar os filtros
	const applyFilters = () => {
		console.log({
			minPrice: $minPrice,
			maxPrice: $maxPrice,
			numberOfReviewers: $numberOfReviewers
		});
		// Aqui você pode chamar uma API ou filtrar os dados localmente
	};
	// ------------------------FILTROS------------------------
	// const modal: ModalSettings = {
	// 	type: 'component',
	// 	title: 'Example Alert',
	// 	body: 'This is an example modal.',
	// 	image: '',
	// 	component: 'fullScreen'
	// };
	// function modalAbstract(abstract: string) {
	// 	modal.body = abstract;
	// 	modalStore.trigger(modal);
	// }

	let modalData = user;
	let classes = 'bg-linear-to-b from-indigo-500 via-purple-500 to-pink-500 text-white';

	function closeModal(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}
</script>

<div class="container mx-auto p-4">
	<!-- Navbar -->

	<!-- Sections -->
	<div class="flex flex-col md:flex-row gap-8 mt-4">
		<!-- Filter Section -->
		<section class="bg-gray-100 rounded-lg shadow-md p-4 mb-8 w-full md:w-1/5">
			<h2 class="text-lg font-semibold mb-4">Filters</h2>

			<div class="mb-4 flex space-x-4">
				<!-- Min Price -->
				<div class="flex-1">
					<label for="min-price" class="block text-sm font-medium mb-1">Min Price:</label>
					<input
						type="number"
						class="w-full h-8 p-2 border border-gray-300 rounded-sm"
						bind:value={$minPrice}
						placeholder="Min."
						min="0"
					/>
				</div>

				<!-- Max Price -->
				<div class="flex-1">
					<label for="max-price" class="block text-sm font-medium mb-1">Max Price:</label>
					<input
						type="number"
						class="w-full h-8 p-2 border border-gray-300 rounded-sm"
						bind:value={$maxPrice}
						placeholder="Max."
						min="0"
					/>
				</div>
			</div>

			<!-- Number of Reviewers -->
			<div class="mb-4 flex items-center space-x-2">
				<!-- <label for="reviewers" class="block text-sm font-medium mb-1">Number of Reviewers:</label> -->
				<label for="reviewers" class="text-sm font-medium whitespace-nowrap">Number of Reviewers:</label>
				<input
					type="number"
					class="w-full h-8 p-2 border border-gray-300 rounded-sm"
					bind:value={$numberOfReviewers}
					min="3"
				/>
			</div>

			<!-- Apply Filters Button -->
			<button
				class="w-full p-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
				onclick={applyFilters}
			>
				Apply Filters
			</button>
		</section>

		<!-- Announced Articles Section -->
		<section class="bg-white shadow-md rounded-sm p-6 mb-8 w-full md:w-4/3">
			<h3 class="text-xl font-bold mb-4">Announced Articles</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each papers as paper, index}
					<a
						data-sveltekit-reload
						href="{rota}/{paper.id}"
						class="flex flex-col gap-2 hover:text-secondary-500"
					>
						<div class="bg-white shadow-md rounded-sm overflow-hidden">
							<header>
								<img src={paper.paperPictures[0]} alt="Post" class="w-full h-48 object-cover" />
							</header>

							<div class="p-4 flex flex-col justify-center gap-4">
								<div class="text-lg font-bold text-center">{paper.title}</div>
								<Abstract abstract={paper.abstract} />
							</div>
							<div class="p-4 flex flex-col justify-center gap-4">
								<div class="text-lg text-center">
									Key words: <div class="text-lg text-center font-bold">{paper.keywords}</div>
								</div>
							</div>

							<hr class="opacity-50" />
							<footer class="p-4 flex flex-col justify-center items-start gap-1">
								<div class="flex items-center">
									<img
										src={paper.mainAuthor.profilePictureUrl}
										alt="Author"
										class="w-8 h-8 rounded-full mr-2"
									/>
									<span>{paper.mainAuthor.firstName} {paper.mainAuthor.lastName}</span>
								</div>
								<span class="text-gray-600">Price: US$ {paper.price}</span>
								<span>Number of pages: {1}</span>
							</footer>
						</div>
					</a>
				{/each}
			</div>
		</section>
	</div>
</div>
