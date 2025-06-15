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

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let reviewers = data.users.filter((u: User) => u.roles.reviewer === true);
	// State for peer review option
	let peer_review: string = '';
	// let reviewers: User;

	// let user = data.user;

	let paper: Paper | null = $state(data.paper);
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

	async function handleAcceptReview() {
		if (!paper || !$page.data.user) return;
		
		try {
			const response = await post(`/review/paperspool/${paper.id}`, {
				paperId: paper.id,
				reviewerId: $page.data.user.id
			});

			if (response.success) {
				await goto('/review/');
			} else {
				alert('Failed to accept review. Please try again.');
			}
		} catch (error) {
			console.error(error);
			alert('An error occurred while accepting the review.');
		}
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}
</script>

{#if paper}
    <div class="container page max-w-[900px] p-4 m-auto">
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-primary-500 mb-2">Review Request</h2>
            <p class="text-surface-600">Please review the paper details below and decide if you would like to accept this review assignment.</p>
            <hr class="mt-4 mb-6 border-t-2 border-surface-200" />
        </div>

        <div class="card p-6 bg-surface-100 rounded-lg shadow-sm mb-6">
            <PaperPreview {paper} user={$page.data.user} />
        </div>

        <div class="flex justify-center gap-4 mt-8">
            <button
                class="btn variant-filled-error px-8 py-3 rounded-lg flex items-center gap-2"
                onclick={() => goto('/review/')}
            >
                <Icon icon="fluent-mdl2:cancel" class="size-5" />
                Decline Review
            </button>
            <button
                class="btn variant-filled-success px-8 py-3 rounded-lg flex items-center gap-2"
                onclick={handleAcceptReview}
            >
                <Icon icon="fluent-mdl2:accept" class="size-5" />
                Accept Review
            </button>
        </div>
    </div>
{/if}
