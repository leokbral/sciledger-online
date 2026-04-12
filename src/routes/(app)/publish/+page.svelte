<script lang="ts">
	import { page } from '$app/stores';
	import PublishPage from '$lib/Pages/Publish/PublishPage.svelte';
	import type { Paper } from '$lib/types/Paper';

	interface Props {
		data: {
			papers: Paper[];
			user: unknown;
		};
	}

	let { data }: Props = $props();
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

	let papers: Paper[] = data.papers;
	let user = data.user;
	//console.log(papers)

	let tabs = [
		{
			name: 'Drafts',
			icon: 'material-symbols-light:draft-outline-rounded',
			rota: '/publish/edit'
		},
		{
			name: 'Reviewer Assignment',
			icon: 'hugeicons:conversation',
			rota: '/publish/reviewer-assignment'
		},
		{
			name: 'In Review',
			icon: 'material-symbols-light:rate-review-outline-rounded',
			rota: '/publish/inreview'
		},
		{
			name: 'Needing Corrections',
			icon: 'iconamoon:attention-circle-thin',
			rota: '/publish/corrections'
		},
		{
			name: 'Published',
			icon: 'material-symbols-light:check-rounded',
			rota: '/publish/published'
		}
	];

	let drafts = papers.filter((p: Paper) => p.status === 'draft');
	let underNegotiation = papers.filter((p: Paper) => p.status === 'reviewer assignment');
	let inReview = papers.filter((p: Paper) => p.status === 'in review');
	let needingCorrections = papers.filter((p: Paper) => p.status === 'needing corrections');
	let published = papers.filter((p: Paper) => p.status === 'published');

	let papersData = [drafts, underNegotiation, inReview, needingCorrections, published];

	let publishData = {
		tabs,
		papersData,
		user
	};

	//let src = 'https://www.biorxiv.org/content/10.1101/2020.05.28.119461v1.full.pdf';
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

<PublishPage data={publishData}></PublishPage>
