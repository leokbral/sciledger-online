<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { User } from '$lib/types/User';
	import type { MessageFeed } from '$lib/types/MessageFeed';
	//import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper = data.paper as Paper;
	let currentUser = data.user as User;
	let messageFeed = data.messageFeed as MessageFeed;
	let reviewAssignments = data.reviewAssignments;
	let isHubOwner = data.isHubOwner || false;

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		const updatedPaper = event.detail.store;

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper); // Use id se for o campo correto

			if (response.paper) {
				// Redireciona para a página de detalhes do artigo editado
				goto(`/publish/`);
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.error(error);
			alert('An error occurred. Please try again.');
		}
	}

	async function hdlSubmitReview(event: CustomEvent) {
		let { newMessage } = event.detail; //.messageFeed;
		newMessage = { ...newMessage, sender: newMessage.sender.id, _id: newMessage.id };

		try {
			// const response = await fetch('/api/messagefeeds', {
			const response = await fetch(`/review/inreview/${data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newMessage,
					id: (messageFeed as any)?.id
				})
			});
			if (!response.ok) {
				const errorData = await response.json();
				console.error('Erro ao enviar mensagem:', errorData);
				alert(`Erro: ${errorData.error}`);
			}
		} catch (error) {
			console.error('Erro na requisição:', error);
		}
	}

	async function handleReviewSubmitted(event: CustomEvent) {
		const { paperId } = event.detail;
		try {
			const response = await fetch(`/review/inreview/${paperId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					reviewerId: (currentUser as User).id // Envia o id do revisor atual
				})
			});
			if (response.ok) {
				await goto('/');
			} else {
				const errorData = await response.json();
				console.error('Error updating paper status:', errorData);
				alert('Review submitted but failed to update paper status');
			}
		} catch (error) {
			console.error('Error:', error);
			alert('Review submitted but an error occurred during status update');
		}
	}
</script>

<PaperReviewPage
	on:reviewSubmitted={handleReviewSubmitted}
	{paper}
	{currentUser}
	{messageFeed}
	{reviewAssignments}
	isHubAdmin={isHubOwner}
	canSubmitReview={(data as any).canSubmitReview === true}
	canViewSubmittedReviews={(data as any).canViewSubmittedReviews === true}
/>
