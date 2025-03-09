<script lang="ts">
	import { goto } from '$app/navigation';
	// import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	import { page } from '$app/stores';
	import AvailableReviewers from '$lib/AvailableReviewers.svelte';
	import type { User } from '$lib/types/User';
	import PapersImages from '$lib/components/PapersImages.svelte';
	import Icon from '@iconify/svelte';

	export let data: PageData;
	let reviewers = data.users.filter((u: User) => u.roles.reviewer === true);
	// State for peer review option
	let peer_review: string = '';
	// let reviewers: User;

	// let user = data.user;

	let paper: Paper | null = data.paper;
	//console.log("www",paper?.authors)
	let userProfiles = data.users; // Ajuste conforme necessário

	let inicialValue: PaperPublishStoreData;

	if (paper) {
		inicialValue = {
			...paper,
			// authors: [paper.mainAuthor, ...paper.coAuthors],
			mainAuthor: paper.mainAuthor
		};
	}

	async function handleSavePaper(event: MouseEvent) {
		console.log('Saving Paper:', paper);

		if (!paper) return;

		// Prepare the updated paper data
		const updatedPaper = {
			...paper,
			selectedReviewers: selectedReviewers,
			peerReviewType: peer_review,
			status: 'in review'
		};

		try {
			// First update the negotiation paper
			const response = await post(`/publish/negotiation/${updatedPaper.id}`, updatedPaper);

			if (response.paper) {
				 // Update price in paperspool and assign reviewers
				const [poolResponse, reviewAssignments] = await Promise.all([
					post(`/api/paperspool/${updatedPaper.id}/update-price`, {
						price: updatedPaper.price
					}),
					post(`/api/review/assign`, {
						paperId: updatedPaper.id,
						reviewerIds: selectedReviewers,
						peerReviewType: peer_review
					})
				]);

				if (poolResponse.success && reviewAssignments.success) {
					goto(`/publish/`);
				} else {
					alert('Failed to update price or assign reviewers');
				}
			} else {
				alert(`Issue: ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.log(error);
			alert('An error occurred. Please try again.');
		}
	}

	let selectedReviewers: string[] = [];

	// Define the toggle function
	function toggleReviewerSelection(reviewerId: string) {
		if (selectedReviewers.includes(reviewerId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}

	function hdlSaveDraft(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}
</script>

<div class="grid grid-cols-[1fr_1fr_1fr] p-5">
	<div></div>
	<div class="flex justify-between gap-3">
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={hdlSaveDraft}
			>Save Draft</button
		>
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={handleSavePaper}
			>Submit to Review</button
		>
	</div>
	<div></div>
</div>

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Under Negotiation</h4>
				<hr class="mt-2 mb-4 !border-t-2" />
				<PaperPreview {paper} user={$page.data.user} />
			</div>
		</div>

		<!-- papers images section -->
		<section>
			{#if $page.url.pathname.includes('negotiation')}
				<PapersImages />
			{/if}
		</section>

		<!-- <div class="p-4 border border-surface-300 rounded-lg">
			<h5 class="text-lg font-semibold mb-2">Price</h5>
			<label for="price" class="block mb-1">Price</label>
			<input
				id="price"
				type="text"
				class="w-full p-2 border border-surface-300 rounded-lg"
				bind:value={paper.price}
				placeholder="Enter price"
			/>
		</div> -->

		<p>Amount</p>
		<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
			<div class="input-group-shim">
				<Icon icon="material-symbols-light:attach-money-rounded" width="24" height="24" />
			</div>

			<input
				type="number"
				class="w-full p-2 border border-surface-300 rounded-lg"
				bind:value={paper.price}
				placeholder="Amount"
			/>
			<select>
				<option>USD</option>
				<!-- <option>CAD</option>
				<option>EURO</option> -->
			</select>
		</div>

		<!-- Peer Review Options -->
		<label for="peer_review" class="block mb-1">Peer Review Options</label>
		<select
			id="peer_review"
			name="peer_review"
			class="w-full p-2 border border-surface-300 rounded-lg"
			bind:value={peer_review}
		>
			<option value="" disabled selected>Select peer review option</option>
			<option value="open">Open</option>
			<option value="selected">Selected</option>
		</select>

		<!-- Conditionally show AvailableReviewers -->
		{#if peer_review === 'selected'}
			<AvailableReviewers {reviewers} {selectedReviewers} {toggleReviewerSelection} />
		{/if}
	</div>
{/if}
