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
					if (store?.status === 'reviewer assignment') {
						await goto('/publish/?submitted=1');
					} else {
						alert('Draft updated successfully!');
					}
				} else {
					// Se era criação, navegar para a página de edição
					const isSubmitted = store?.status === 'reviewer assignment';
					goto(`/publish/edit/${response.paper.id}${isSubmitted ? '?submitted=1' : ''}`);
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
				'Continue editing your draft article.' : 
				'Create a new article by filling in the details below. You can save as draft and continue editing later.'
			}
		</p>
		
		{#if paper?.id}
			<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
				<h3 class="font-semibold text-blue-800 mb-2">📄 Draft Information</h3>
				<p><strong>Title:</strong> <span class="inline">{@html paper.title || 'Untitled'}</span></p>
				<p><strong>Status:</strong> <span class="capitalize">{paper.status}</span></p>
				<p><strong>Last Modified:</strong> {new Date(paper.updatedAt || paper.createdAt).toLocaleDateString()}</p>
			</div>

			<!-- Next Steps Guide -->
			<div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
				<h3 class="font-semibold text-green-800 mb-2">✅ Next Steps</h3>
				<p class="text-gray-700 mb-3">After saving your draft, you can:</p>
				<div class="space-y-2">
					<div class="flex items-start gap-2">
						<span class="text-green-600 font-bold">1.</span>
						<span>Continue editing and click <strong>"Save Draft"</strong> to save your changes</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-green-600 font-bold">2.</span>
						<span>Once your article is complete, click <strong>"Submit Article"</strong> at the bottom to submit for review</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-green-600 font-bold">3.</span>
						<span>You can return to <a href="/publish" class="text-blue-600 hover:underline font-semibold">My Papers</a> to view all your drafts and submissions</span>
					</div>
				</div>
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