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
	import { Progress } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
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

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		console.log('Updated Paper Data:', event.detail.store);

		const updatedPaper = event.detail.store;
		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/negotiation/${updatedPaper.id}`, updatedPaper); // Use id se for o campo correto

			if (response.paper) {
				// Redireciona para a página de detalhes do artigo editado
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
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}
			>Save Draft</button
		>
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmit}
			>Submit to Review</button
		>
	</div>
	<div></div>
</div>

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<div>PROGRESS BAR TIME
			<Progress value={60} max={100} class="my-8" />
		</div>

		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Under Negotiation</h4>
				<hr class="mt-2 mb-4 border-t-2!" />
				<PaperPreview {paper} user={$page.data.user} />
			</div>
		</div>
	</div>
{/if}
