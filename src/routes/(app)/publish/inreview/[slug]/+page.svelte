<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import type { PageData } from './$types';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	import { page } from '$app/stores';
	import AvailableReviewers from '$lib/AvailableReviewers.svelte';
	import type { User } from '$lib/types/User';
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let reviewers = (data.users as User[]).filter((u: User) => u.roles.reviewer === true);
	// State for peer review option
	let peer_review: string = '';
	// let reviewers: User;

	// let user = data.user;

	let paper: Paper | null = data.paper as Paper;
	//console.log("www",paper?.authors)
	let userProfiles = data.users; // Ajuste conforme necessário
	let currentRound = paper?.reviewRound || 1;
	let submittedReviewsThisRound =
		paper?.peer_review?.reviews?.filter(
			(r: any) => r?.status === 'submitted' && (r?.reviewRound || 1) === currentRound
		) || [];

	// Last refresh timestamp for manual refresh button
	let lastRefreshTime = $state<Date | null>(null);

	// Expandable reviews
	let expandedReviews = $state<Set<number>>(new Set());
	const toggleReviewExpanded = (idx: number) => {
		const newSet = new Set(expandedReviews);
		if (newSet.has(idx)) {
			newSet.delete(idx);
		} else {
			newSet.add(idx);
		}
		expandedReviews = newSet;
	};

	const toggleAllReviews = () => {
		if (expandedReviews.size === submittedReviewsThisRound.length) {
			expandedReviews = new Set();
		} else {
			expandedReviews = new Set(submittedReviewsThisRound.map((_, idx) => idx));
		}
	};

	const quantitativeFields = [
		{ key: 'originality', label: 'Originality' },
		{ key: 'clarity', label: 'Clarity' },
		{ key: 'literatureReview', label: 'Literature Review' },
		{ key: 'theoreticalFoundation', label: 'Theoretical Foundation' },
		{ key: 'methodology', label: 'Methodology' },
		{ key: 'reproducibility', label: 'Reproducibility' },
		{ key: 'results', label: 'Results' },
		{ key: 'figures', label: 'Figures' },
		{ key: 'limitations', label: 'Limitations' },
		{ key: 'language', label: 'Language' },
		{ key: 'impact', label: 'Impact' }
	];

	const recommendationLabels: Record<string, string> = {
		accept_without_changes: 'Accept without changes',
		accept_with_minor_revisions: 'Accept with minor revisions',
		major_revision: 'Major revision',
		reject: 'Reject'
	};

	const ethicsHumanResearchLabel: Record<string, string> = {
		yes: 'Yes',
		no: 'No',
		'': '—'
	};

	const ethicsApprovalLabel: Record<string, string> = {
		adequate: 'Adequate',
		justified: 'Justified',
		absent: 'Absent',
		'': '—'
	};

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

	function hdlSaveDraft(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}

	// Função para recarregar as reviews do servidor
	async function refreshReviews() {
		try {
			const response = await fetch(`/api/papers/${paper?.id}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (!response.ok) throw new Error('Failed to fetch paper');
			
			const updatedPaper = await response.json();
			paper = updatedPaper;
			
			// Atualizar submittedReviewsThisRound
			submittedReviewsThisRound = (updatedPaper?.peer_review?.reviews || []).filter(
				(r: any) => r?.status === 'submitted' && (r?.reviewRound || 1) === currentRound
			);
			
			lastRefreshTime = new Date();
			console.log('✅ Reviews refreshed:', submittedReviewsThisRound.length, 'reviews received');
		} catch (error) {
			console.error('Error refreshing reviews:', error);
		}
	}

	// Load data on page mount and expand all reviews by default
	onMount(() => {
		// Expandir todas as revisões por padrão
		if (submittedReviewsThisRound.length > 0) {
			expandedReviews = new Set(submittedReviewsThisRound.map((_, idx) => idx));
		}
	});
</script>

<div class="grid grid-cols-[1fr_1fr_1fr] p-5">
	<div></div>
	{#if paper && paper.status !== 'in review'}
		<div class="flex justify-between gap-3">
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}
				>Save Draft</button
			>
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmit}
				>Submit to Review</button
			>
		</div>
	{/if}
	<div></div>
</div>

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="mb-6">
			<CorrectionProgressBar 
				{paper} 
				currentUser={$page.data.user} 
				showDetails={true} 
				size="lg" 
			/>
		</div>

		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">In Review</h4>
				<hr class="mt-2 mb-4 border-t-2!" />
				<PaperPreview {paper} user={$page.data.user} />
			</div>
		</div>

		<!-- Reviews arriving during this round (read-only) -->
		<div class="mt-6">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<h5 class="text-lg font-semibold">Reviews received (Round {currentRound})</h5>
					{#if submittedReviewsThisRound.length > 0}
						<button
							class="text-xs px-3 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
							onclick={toggleAllReviews}
						>
							{expandedReviews.size === submittedReviewsThisRound.length ? 'Collapse All' : 'Expand All'}
						</button>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if lastRefreshTime}
						<span class="text-xs text-surface-400">
							Last updated: {lastRefreshTime.toLocaleTimeString()}
						</span>
					{/if}
				</div>
			</div>

			<!-- Progress indicator showing review slots -->
			{#if paper?.peer_review?.responses}
				{@const totalReviewers = paper.peer_review.responses.length}
				{@const completedReviews = submittedReviewsThisRound.length}
				<div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-semibold text-blue-900 dark:text-blue-200">
							Reviews: <strong>{completedReviews}/{totalReviewers}</strong> submitted
						</span>
					</div>
					<div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
						<div 
							class="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
							style="width: {(completedReviews / totalReviewers) * 100}%"
						></div>
					</div>
				</div>
			{/if}

			{#if submittedReviewsThisRound.length === 0}
				<div class="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm text-surface-600 border border-surface-300">
					<div class="flex items-center gap-2 mb-1">
						<Icon icon="mdi:clock-outline" width="18" height="18" />
						<span class="font-medium">Waiting for reviews...</span>
					</div>
					<p class="text-xs mt-2">Reviews will appear here as reviewers submit them. Refresh the page or check your notifications for new reviews.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each submittedReviewsThisRound as review, idx}
						{@const reviewerObj = typeof review.reviewerId === 'object' ? review.reviewerId : null}
						{@const isExpanded = expandedReviews.has(idx)}
						<div class="rounded-lg border-2 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700 animate-in fade-in-50 duration-500 overflow-hidden transition-all">
							<!-- Clickable header -->
							<button
								class="w-full p-4 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors cursor-pointer flex items-start justify-between gap-3"
								onclick={() => toggleReviewExpanded(idx)}
							>
								<div class="flex items-center gap-2 text-left flex-1">
									<div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
										{idx + 1}
									</div>
									<div class="flex-1">
										<p class="font-semibold text-gray-900 dark:text-white">
											{reviewerObj ? `${reviewerObj.firstName} ${reviewerObj.lastName}` : 'Reviewer'}
										</p>
										<p class="text-xs text-surface-500">
											✓ Submitted {review.submissionDate ? new Date(review.submissionDate).toLocaleString() : 'just now'}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2 flex-shrink-0">
									<span class="inline-block px-2 py-1 bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
										{recommendationLabels[review.recommendation] || review.recommendation || 'No recommendation'}
									</span>
									<Icon 
										icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} 
										width="24" 
										height="24"
										class="text-surface-600 dark:text-surface-400 transition-transform duration-300"
									/>
								</div>
							</button>

							<!-- Expandable content -->
							{#if isExpanded}
								<div class="px-4 pb-4 pt-0 border-t border-green-200 dark:border-green-800 bg-white/50 dark:bg-surface-900/20 animate-in fade-in-50 duration-300">
									<!-- Review content -->
									{#if review.qualitativeEvaluation?.strengths}
										<div class="mb-3 p-3 bg-white dark:bg-surface-800 rounded border-l-4 border-green-500">
											<p class="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">💡 Strengths</p>
											<p class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{review.qualitativeEvaluation.strengths}</p>
										</div>
									{/if}

									{#if review.qualitativeEvaluation?.weaknesses}
										<div class="mb-3 p-3 bg-white dark:bg-surface-800 rounded border-l-4 border-amber-500">
											<p class="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">⚠️ Weaknesses / Corrections needed</p>
											<p class="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{review.qualitativeEvaluation.weaknesses}</p>
										</div>
									{/if}

									{#if review.quantitativeEvaluation}
										<div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
											<p class="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-2">📊 Scores (1-5)</p>
											<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
												{#each quantitativeFields as field}
													<div class="bg-white dark:bg-surface-800 p-2 rounded">
														<span class="text-surface-600 dark:text-surface-400">{field.label}:</span>
														<span class="font-bold text-gray-900 dark:text-white ml-1">{review.quantitativeEvaluation?.[field.key] ?? '—'}/5</span>
													</div>
												{/each}
											</div>
											<div class="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
												<div class="bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800">
													<span class="text-surface-600 dark:text-surface-400">Average score:</span>
													<span class="font-bold text-gray-900 dark:text-white ml-1">{review.averageScore ?? '—'}/5</span>
												</div>
												<div class="bg-indigo-50 dark:bg-indigo-950/20 p-2 rounded border border-indigo-200 dark:border-indigo-800">
													<span class="text-surface-600 dark:text-surface-400">Weighted score:</span>
													<span class="font-bold text-gray-900 dark:text-white ml-1">{review.weightedScore ?? '—'}/5</span>
												</div>
											</div>
										</div>
									{/if}

									{#if review.ethics}
										<div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
											<p class="text-xs font-semibold text-surface-600 dark:text-surface-400 mb-2">🧭 Ethics</p>
											<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
												<div class="bg-white dark:bg-surface-800 p-2 rounded">
													<span class="text-surface-600 dark:text-surface-400">Human research:</span>
													<span class="font-bold text-gray-900 dark:text-white ml-1">{ethicsHumanResearchLabel[review.ethics.involvesHumanResearch] || '—'}</span>
												</div>
												<div class="bg-white dark:bg-surface-800 p-2 rounded">
													<span class="text-surface-600 dark:text-surface-400">Ethics approval:</span>
													<span class="font-bold text-gray-900 dark:text-white ml-1">{ethicsApprovalLabel[review.ethics.ethicsApproval] || '—'}</span>
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<div class="mt-4 p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
				<Icon icon="mdi:information" width="16" height="16" class="inline mr-2" />
				The paper remains locked until all reviewers submit. Reviews are automatically updated.
			</div>
		</div>
	</div>
{/if}
