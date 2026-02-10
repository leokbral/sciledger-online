<script lang="ts">
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	import { page } from '$app/stores';
	import AvailableReviewers from '$lib/AvailableReviewers.svelte';
	import type { User } from '$lib/types/User';
	import Icon from '@iconify/svelte';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let reviewers = data.users.filter((u: User) => u.roles.reviewer === true);
	// State for peer review option
	let peer_review: string = '';
	// let reviewers: User;

	// let user = data.user;

	let paper: Paper | null = $state(data.paper as Paper);
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

</script>

{#if paper}
    <div class="container max-w-5xl mx-auto px-4 py-8">
        <!-- Header Section -->
        <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
                <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <Icon icon="mdi:file-document-edit" class="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Review Request</h1>
                    <p class="text-gray-600 dark:text-gray-400 mt-1">You've been invited to review this paper</p>
                </div>
            </div>
        </div>

        <!-- Barra de Progresso do Tempo de Revisão -->
        {#if paper.status === 'in review' || paper.status === 'needing corrections'}
            <div class="mb-6">
                <CorrectionProgressBar 
                    {paper} 
                    currentUser={$page.data.user} 
                    showDetails={true} 
                    size="lg" 
                />
            </div>
        {/if}

        <!-- Paper Content Card -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8 border border-gray-100 dark:border-gray-700">
            <div class="p-8">
                <PaperPreview {paper} user={$page.data.user} showReadMore={false} />
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row justify-center gap-4">
            <button
                class="group relative px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                onclick={() => goto('/review/')}
            >
                <Icon icon="mdi:close-circle" class="w-6 h-6" />
                <span>Decline Review</span>
            </button>
            
            <button
                class="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                onclick={handleAcceptReview}
            >
                <Icon icon="mdi:check-circle" class="w-6 h-6" />
                <span>Accept Review</span>
            </button>
        </div>

        <!-- Info Footer -->
        <div class="mt-8 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
                By accepting this review, you commit to providing constructive feedback within the specified deadline.
            </p>
        </div>
    </div>
{/if}
