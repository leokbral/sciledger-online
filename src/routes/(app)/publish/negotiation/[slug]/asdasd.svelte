<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	import { page } from '$app/stores';
	import AvailableReviewers from '$lib/AvailableReviewers.svelte';
	import type { User } from '$lib/types/User';

	export let data: PageData;
	// State for peer review option
	let peer_review: string = '';
	let paper: Paper | null = data.paper;
	let userProfiles = data.users;

	let inicialValue: PaperPublishStoreData;

	if (paper) {
		inicialValue = {
			...paper,
			mainAuthor: paper.mainAuthor
		};
	}

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		console.log('Updated Paper Data:', event.detail.store);

		const updatedPaper = event.detail.store;
		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/negotiation/${updatedPaper.id}`, updatedPaper);

			if (response.paper) {
				goto(`/publish/`);
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.log(error);
			alert('An error occurred. Please try again.');
		}
	}

	let selectedReviewers: string[] = [];

	function toggleReviewerSelection(reviewerId: string) {
		if (selectedReviewers.includes(reviewerId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}
</script>

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Published Articles</h4>
				<hr class="mt-2 mb-4 !border-t-2" />
				<PaperPreview {paper} user={$page.data.user} />
			</div>
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
			<AvailableReviewers
				reviewers={$page.data.reviewers}
				{selectedReviewers}
				{toggleReviewerSelection}
			/>
		{/if}
	</div>
{/if}
