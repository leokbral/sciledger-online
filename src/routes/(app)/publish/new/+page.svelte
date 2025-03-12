<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	//import { userProfiles } from '../../UserProfile';
	//import Publisher from './Publisher.svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();
	let userProfiles = data.users;
	//let articleComponent: PaperPublishPage;

	async function hdlSavePaper(event: { detail: { store: any } }) {
		console.log(event.detail.store);

		const paper = event.detail.store;
		console.log(paper)
		try {
			const response = await post(`/publish/new`, paper);

			if (response.paper) {
				goto(`/publish/new/${response.paper.id}`);
			} else {
				console.log(paper);
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			alert('An error occurred. Please try again.');
		} finally {
		}
	}
</script>

<!-- <Publisher
	article={{
		title: '',
		description: '',
		body: '',
		tagList: []
	}}
	errors={form?.errors}
/> -->

<!-- <Publisher
	article={{
		title: '',
		description: '',
		body: '',
		tagList: []
	}}
	errors={''}
/> -->

<PaperPublishPage on:savePaper={hdlSavePaper} author={data.user} authorsOptions={userProfiles} />
<!-- <PaperPublishPage
	article={{
		title: '',
		authors: [],
		mainAuthorId: '',
		abstract: '', //{ time: Date.now(), blocks: [] },
		coAuthorsIds: [], //{ time: Date.now(), blocks: [] },
		id: 'string', // ID único gerado para o paper
		correspondingAuthor: 'string', // Autor correspondente como UUID
		reviewers: [], // Lista de revisores como UUIDs
		keywords: [],
		content: '',
		pdfUrl: '',
		paperPictures: [], // Alterado de PaperPictures para paperPictures
		citations: [], // Lista de citações como UUIDs
		likes: [], // Lista de usuários que curtiram como UUIDs
		comments: [], // Lista de comentários como UUIDs
		tags: [],
		status: 'string',
		price: 0,
		score: 0,
		submittedBy: '' 
	}}
	bind:this={articleComponent}
	authorsOptions={userProfiles}
/> -->
