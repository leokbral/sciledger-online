<script lang="ts">
	// import { type ModalSettings } from '@skeletonlabs/skeleton-svelte';
	import Abstract from '$lib/components/hope/Abstract.svelte';
	import PaperList from '$lib/PaperList/index.svelte';
	import type { Paper } from '$lib/types/Paper';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
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
		<!-- <section class="bg-gray-100 rounded-lg shadow-md p-4 mb-8 w-full md:w-1/5">
			<h2 class="text-lg font-semibold mb-4">Filters</h2>

			<div class="mb-4 flex space-x-4">
				<! -- Min Price -- >
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

				<! -- Max Price -- >
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

			<! -- Number of Reviewers -- >
			<div class="mb-4 flex items-center space-x-2">
				<! -- <label for="reviewers" class="block text-sm font-medium mb-1">Number of Reviewers:</label> -- >
				<label for="reviewers" class="text-sm font-medium whitespace-nowrap">Number of Reviewers:</label>
				<input
					type="number"
					class="w-full h-8 p-2 border border-gray-300 rounded-sm"
					bind:value={$numberOfReviewers}
					min="3"
				/>
			</div>

			<! -- Apply Filters Button -- >
			<button
				class="w-full p-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600"
				onclick={applyFilters}
			>
				Apply Filters
			</button>
		</section> -->

		<!-- Announced Articles Section -->
		<section class="bg-white shadow-md rounded-lg p-6 mb-8 w-full">
			<h3 class="text-2xl font-bold mb-6 text-gray-800">Announced Articles</h3>
			<div class="space-y-4">
				{#each papers as paper}
					<div
						class="border rounded-lg p-4 transition-colors hover:shadow-lg {paper.hubId &&
						paper.isLinkedToHub
							? 'bg-gradient-to-r from-white to-primary-50 border-l-4 border-l-primary-500'
							: 'bg-white'}"
					>
						<div class="flex flex-col">
							<div>
								<!-- Hub Information -->
								{#if paper.hubId && paper.isLinkedToHub}
									<div class="mb-4">
										<div class="flex items-center gap-2 mb-2">
											<span
												class="text-xs font-semibold text-primary-700 bg-primary-100 px-3 py-1 rounded-full"
											>
												{typeof paper.hubId === 'object' && 'type' in paper.hubId
													? paper.hubId.type.toUpperCase()
													: ''}
											</span>
											<span class="text-sm text-gray-600">Part of Hub:</span>
										</div>
										<a
											href={typeof paper.hubId === 'object' && '_id' in paper.hubId
												? `/hub/view/${paper.hubId._id}`
												: '#'}
											class="text-primary-700 hover:text-primary-800 font-medium"
										>
											{typeof paper.hubId === 'object' && 'title' in paper.hubId
												? paper.hubId.title
												: ''}
										</a>
									</div>
								{:else}
									<!-- Se não estiver vinculado a um hub, exibe "Research Paper" -->
									<span
										class="text-xs font-semibold text-primary-700 bg-blue-100 px-3 py-1 rounded-full"
									>
										RESEARCH PAPER
									</span>
								{/if}

								<h3 class="text-lg font-medium text-gray-900 mt-4">
									<a
										href="{rota}/{paper.id}"
										class="hover:text-primary-600 transition-colors"
										data-sveltekit-reload
									>
										{@html paper.title}
									</a>
								</h3>

								<div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
									<!-- Creation Date -->
									<span class="flex items-center gap-1">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
										{new Date(paper.createdAt).toLocaleDateString()}
									</span>

									<!-- Separator -->
									<span class="text-gray-300">|</span>

									<!-- Author + Co-authors -->
									<div class="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
										<!-- Main Author -->
										<div class="flex items-center gap-2">
											{#if paper.mainAuthor.profilePictureUrl}
												<Avatar
													src={paper.mainAuthor.profilePictureUrl}
													name={`${paper.mainAuthor.firstName} ${paper.mainAuthor.lastName}`}
													size="w-9"
													background="bg-gray-100"
												/>
											{:else}
												<Avatar
													name={`${paper.mainAuthor.firstName} ${paper.mainAuthor.lastName}`}
													size="w-9"
													style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
													background="bg-gray-100"
												/>
											{/if}
											<a
												href={`/profile/${paper.mainAuthor?.username}`}
												class="text-primary-500 font-medium whitespace-nowrap hover:underline"
											>
												{paper.mainAuthor.firstName}
												{paper.mainAuthor.lastName}
											</a>
										</div>

										<!-- Co-authors -->
										{#if paper.coAuthors?.length}
											{#each paper.coAuthors as ca}
												<div class="flex items-center gap-2">
													{#if ca.profilePictureUrl}
														<Avatar
															src={ca.profilePictureUrl}
															name={`${ca.firstName} ${ca.lastName}`}
															size="w-9"
															background="bg-gray-100"
														/>
													{:else}
														<Avatar
															name={`${ca.firstName} ${ca.lastName}`}
															size="w-9"
															style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
															background="bg-gray-100"
														/>
													{/if}
													<a
														href={`/profile/${ca.username}`}
														class="text-primary-500 font-medium whitespace-nowrap hover:underline"
													>
														{ca.firstName}
														{ca.lastName}
													</a>
												</div>
											{/each}
										{/if}
									</div>
								</div>
								<div class="my-4">
									<div
										class="bg-gray-300 w-full h-48 rounded-sm flex items-center justify-center text-gray-500 mb-4 overflow-hidden"
									>
										{#if paper.paperPictures?.[0]}
											<img
												src={`/api/images/${paper.paperPictures[0]}`}
												alt="Paper Images"
												class="w-full h-48 object-cover"
											/>
										{:else}
											<span>Carregando imagem...</span>
										{/if}
									</div>
								</div>

								{#if paper.abstract}
									<div class="text-gray-700 mt-6 line-clamp-2 prose-sm">
										{@html paper.abstract}
									</div>
								{/if}
							</div>
						</div>

						<!-- Bottom section with keywords and actions -->
						<div class="flex justify-between items-end mt-4">
							<div>
								{#if paper.keywords?.length}
									<div class="flex gap-2 mt-2 flex-wrap">
										{#each paper.keywords as keyword}
											<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
												{keyword.trim()}
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								<span class="font-bold text-green-600">US$ {paper.price}</span>
								<a
									href="{rota}/{paper.id}"
									class="btn btn-sm bg-primary-100-700 text-primary-700-100 hover:bg-primary-200-600 hover:text-primary-800-50 transition-colors duration-200 flex items-center gap-1"
									data-sveltekit-reload
								>
									Read More
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
											clip-rule="evenodd"
										/>
									</svg>
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>
