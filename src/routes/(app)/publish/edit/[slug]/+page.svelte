<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper: Paper | null = (data.paper as Paper) ?? null;
	//console.log("www",paper?.authors)
	let userProfiles = data.users; // Ajuste conforme necessário
	let submittedConfirmation = $derived($page.url.searchParams.get('submitted') === '1');
	let showSubmittedConfirmation = $state(false);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}

		if (submittedConfirmation) {
			showSubmittedConfirmation = true;
			dismissTimer = setTimeout(() => {
				showSubmittedConfirmation = false;
			}, 6000);
		} else {
			showSubmittedConfirmation = false;
		}

		return () => {
			if (dismissTimer) {
				clearTimeout(dismissTimer);
				dismissTimer = null;
			}
		};
	});

	function closeSubmittedBanner() {
		showSubmittedConfirmation = false;
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}
	}

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

		// const updatedPaper = {
		// 	...store,
		// 	status: 'reviewer assignment'
		// };

		// console.log('Saving Updated Paper:', updatedPaper);

		try {
			// const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper);
			const response = await post(`/publish/edit/${store.id}`, store);
			console.log(response);
			if (response.paper) {
				const isSubmitted = store?.status === 'reviewer assignment';
				goto(`/publish/${isSubmitted ? '?submitted=1' : ''}`);
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.log(error);
			alert('An error occurred. Please try again.');
		}
	}
</script>

{#if showSubmittedConfirmation}
	<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
		<div class="flex items-start justify-between gap-3">
			<div class="flex items-start gap-3">
				<div class="mt-0.5">
					<svg class="h-5 w-5 text-green-700" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
					</svg>
				</div>
				<div>
					<p class="text-sm font-semibold text-green-900">Submission completed successfully</p>
					<p class="mt-1 text-sm text-green-800">Your article is now in the reviewer assignment stage.</p>
				</div>
			</div>
			<button
				type="button"
				onclick={closeSubmittedBanner}
				class="rounded p-1 text-green-800 hover:bg-green-100"
				aria-label="Dismiss notification"
			>
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>
	</div>
{/if}

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