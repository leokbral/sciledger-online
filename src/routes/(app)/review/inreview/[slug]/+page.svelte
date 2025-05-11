<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	//import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	console.log("www0",data)

	let paper = data.paper;
	let currentUser = data.user;
	let messageFeed = data.messageFeed;
	//console.log("www",paper?.authors)

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		console.log('Updated Paper Data:', event.detail.store);
		const updatedPaper = event.detail.store;
		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper); // Use id se for o campo correto

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

	async function hdlSubmitReview(event: CustomEvent) {
		let { newMessage } = event.detail; //.messageFeed;
		console.log(event.detail);
		newMessage = { ...newMessage, sender: newMessage.sender.id, _id: newMessage.id };

		console.log(newMessage);
		//console.log('chamou review', event.detail)

		try {
			// const response = await fetch('/api/messagefeeds', {
			const response = await fetch(`/review/inreview/${data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newMessage,
					id: messageFeed?.id
				})
			});
			console.log(response.body);
			if (!response.ok) {
				const errorData = await response.json();
				console.error('Erro ao enviar mensagem:', errorData);
				alert(`Erro: ${errorData.error}`);
			}
		} catch (error) {
			console.error('Erro na requisição:', error);
		}
	}
</script>

<PaperReviewPage
	onsavePaper={handleSavePaper}
	onsubmitReview={hdlSubmitReview}
	{paper}
	{currentUser}
	{messageFeed}
/>
