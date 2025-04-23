<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper: Paper | null = data.paper;
	//console.log("www",paper?.authors)
	let userProfiles = data.users; // Ajuste conforme necessário

	let inicialValue: PaperPublishStoreData = $state({
		...paper,
		// authors: [paper.mainAuthor, ...paper.coAuthors],
		mainAuthor: paper?.mainAuthor
	} as PaperPublishStoreData);
	// if (paper) {
	// 	inicialValue = {
	// 		...paper,
	// 		// authors: [paper.mainAuthor, ...paper.coAuthors],
	// 		mainAuthor: paper.mainAuthor
	// 	};
	// }

	async function savePaper( store: any ) {
		console.log('Updated Paper Data:', store);

		const updatedPaper = store;
		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper); // Use id se for o campo correto
			console.log(response);
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
</script>

<!-- <PaperPublishPage
	on:savePaper={handleSavePaper}
	{inicialValue}
	author={data.user}
	authorsOptions={userProfiles}
/> -->
<PaperPublishPage
	{savePaper}
	{inicialValue}
	author={data.user}
	authorsOptions={userProfiles}
/>