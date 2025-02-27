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
	<div class="flex justify-end items-center gap-3">
		<button
			class="bg-transparent text-primary-500 rounded-full p-2 border border-primary-500 hover:bg-primary-100 hover:text-primary-700 transition-all duration-300"
			on:click={hdlSaveDraft}
		>
			<Icon icon="fluent-mdl2:accept" class="size-6" />
		</button>
	</div>
	<div></div>
</div>

<!-- <div class="grid grid-cols-[1fr_1fr_1fr] p-5">
	<div></div>
	<div class="flex justify-between gap-3">
		<Icon icon="fluent-mdl2:accept" class="text-primary-500 size-8" />
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={hdlSaveDraft}
			>Save Draft</button
		>
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={hdlSubmit}
			>Submit to Review</button
		>
	</div>
	<div></div>
</div> -->

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Não sei o que vou colocar aqui</h4>
				<hr class="mt-2 mb-4 !border-t-2" />
				<PaperPreview {paper} user={$page.data.user} />
			</div>
		</div>
		<div class="p-4 border border-surface-300 rounded-lg">
			<h5 class="text-lg font-semibold mb-2">Price</h5>
			<label for="price" class="block mb-1">Price</label>
			<input
				id="price"
				type="text"
				class="w-full p-2 border border-surface-300 rounded-lg"
				bind:value={paper.price}
				placeholder="Enter price"
			/>

			<h5 class="text-lg font-semibold mb-2">Pages</h5>
			<label for="price" class="block mb-1">Pages</label>
		</div>
	</div>
{/if}
