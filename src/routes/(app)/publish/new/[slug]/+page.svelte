<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { User } from '$lib/types/User';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper: Paper | null = $state(data.paper);
	let userProfiles = data.users;

	// Criar valor inicial baseado no paper existente
	let inicialValue: PaperPublishStoreData = $state({
		...(data.paper as any),
		mainAuthor: (data.paper as Paper)?.mainAuthor
	} as PaperPublishStoreData);

	async function savePaper(store: any) {
		console.log('Saving paper (new/draft):', store);

		try {
			// Determinar se é criação ou edição
			const isEdit = store.id && store.id !== '';
			const endpoint = isEdit ? `/publish/edit/${store.id}` : '/publish/new';
			
			const response = await post(endpoint, store);
			console.log('Response:', response);

			if (response.paper) {
				if (isEdit) {
					// Se era edição, atualizar os dados locais
					paper = response.paper;
					inicialValue = {
						...response.paper,
						mainAuthor: response.paper?.mainAuthor
					} as PaperPublishStoreData;
					alert('Draft updated successfully!');
				} else {
					// Se era criação, navegar para a página de edição
					goto(`/publish/new/${response.paper.id}`);
				}
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.error('Error saving paper:', error);
			alert('An error occurred. Please try again.');
		}
	}
</script>

<main class="max-w-7xl mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">
			{paper?.id ? 'Edit Draft Article' : 'Create New Article'}
		</h1>
		<p class="text-gray-600">
			{paper?.id ? 
				'Continue editing your draft article. Your changes will be saved automatically.' : 
				'Create a new article by filling in the details below. You can save as draft and continue editing later.'
			}
		</p>
		
		{#if paper?.id}
			<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h3 class="font-semibold text-blue-800 mb-2">� Draft Information</h3>
				<p><strong>Title:</strong> {paper.title || 'Untitled'}</p>
				<p><strong>Status:</strong> <span class="capitalize">{paper.status}</span></p>
				<p><strong>Last Modified:</strong> {new Date(paper.updatedAt || paper.createdAt).toLocaleDateString()}</p>
			</div>
		{/if}
	</div>

	<!-- Paper Editor -->
	<div class="bg-white rounded-lg shadow-md p-6">
		<PaperPublishPage
			{savePaper}
			{inicialValue}
			author={data.user as User}
			authorsOptions={userProfiles}
		/>
	</div>
</main>