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

	async function savePaper(store: any) {
		// Check required fields
		const requiredFields = {
			title: 'Title',
			abstract: 'Abstract',
			mainAuthor: 'Main Author',
			correspondingAuthor: 'Corresponding Author',
			keywords: 'Keywords',
			pdfUrl: 'PDF URL'
		};

		const missingFields = Object.entries(requiredFields)
			.filter(([key]) => !store[key])
			.map(([, label]) => label);

		if (missingFields.length > 0) {
			alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
			return;
		}

		const updatedPaper = {
			...store,
			status: 'under_negotiation'
		};

		console.log('Saving Updated Paper:', updatedPaper);

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper);
			console.log(response);
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