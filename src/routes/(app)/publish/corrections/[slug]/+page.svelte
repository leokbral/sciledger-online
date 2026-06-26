<script lang="ts">
	import { goto } from '$app/navigation';
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import PaperPublishPage from '$lib/Pages/Paper/PaperPublishPage.svelte';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { Review } from '$lib/types/Review';
	import type { User } from '$lib/types/User';
	import type { PageData } from './$types';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper = $state(data.paper as Paper);
	let currentUser = $state(data.user as User);
	let messageFeed = $state(data.messageFeed);
	let users: Array<{ id: string; firstName: string; lastName: string }> = data.users as Array<{
		id: string;
		firstName: string;
		lastName: string;
	}>;
	let userProfiles = data.users; // Para o PaperPublishPage

	// Initialize correction progress from paper data
	let correctionProgress: Record<string, boolean> = $state({});

	// Set initial state after component mount
	$effect(() => {
		if (paper && !Object.keys(correctionProgress).length) {
			correctionProgress = (paper as Paper)?.correctionProgress || {};
		}
	});

	// Estado para controlar se estamos em modo de edição
	let isEditMode = $state(false);

	// Valor inicial para o editor
	let inicialValue: PaperPublishStoreData = $state({
		...(data.paper as any),
		mainAuthor: (data.paper as Paper)?.mainAuthor
	} as PaperPublishStoreData);

	// Function to get reviewer name by ID
	function getReviewerName(reviewerId: string | any): string {
		// Handle if reviewerId is an object with id property
		const actualReviewerId =
			typeof reviewerId === 'object' ? reviewerId?.id || reviewerId?._id : reviewerId;

		const reviewer = users.find((user: any) => {
			return user.id === actualReviewerId || user._id === actualReviewerId;
		});

		if (reviewer) {
			return `${reviewer.firstName} ${reviewer.lastName}`;
		}

		// If not found, try to extract from reviewerId object if it has name properties
		if (typeof reviewerId === 'object' && reviewerId?.firstName) {
			return `${reviewerId.firstName} ${reviewerId.lastName}`;
		}

		return `Reviewer ID: ${actualReviewerId || 'Unknown'}`;
	}

	// Function to get recommendation text
	function getRecommendationText(recommendation: string): string {
		const recommendations: Record<string, string> = {
			accept_without_changes: 'Accept without changes',
			accept_with_minor_revisions: 'Accept with minor revisions',
			major_revision: 'Major revision required',
			reject: 'Decline'
		};
		return recommendations[recommendation] || recommendation;
	}

	function getEthicsText(value: string): string {
		const ethics: Record<string, string> = {
			yes: 'Yes',
			no: 'No',
			adequate: 'Adequate',
			justified: 'Justified',
			absent: 'Absent'
		};

		return ethics[value] || value || 'Not provided';
	}

	// Function to clean title from <p> tags
	function cleanTitle(title: string): string {
		return title.replace(/<\/?p>/gi, '');
	}

	// Function to get recommendation badge class
	function getRecommendationClass(recommendation: string): string {
		const classes: Record<string, string> = {
			accept_without_changes: 'bg-green-100 text-green-800',
			accept_with_minor_revisions: 'bg-yellow-100 text-yellow-800',
			major_revision: 'bg-orange-100 text-orange-800',
			reject: 'bg-red-100 text-red-800'
		};
		return classes[recommendation] || 'bg-gray-100 text-gray-800';
	}

	// Function to format criteria name
	function formatCriteriaName(key: string): string {
		const names: Record<string, string> = {
			originality: 'Originality',
			clarity: 'Clarity',
			literatureReview: 'Literature Review',
			theoreticalFoundation: 'Theoretical Foundation',
			methodology: 'Methodology',
			reproducibility: 'Reproducibility',
			results: 'Results',
			figures: 'Figures',
			limitations: 'Limitations',
			language: 'Language',
			impact: 'Impact'
		};
		return names[key] || key;
	}

	function formatFileSize(bytes?: number): string {
		if (!bytes) return '';
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function getReviewAttachmentUrl(attachment: any): string {
		return `/api/reviews/attachments/${encodeURIComponent(attachment.fileId || attachment.id)}`;
	}

	const detailedReviewFields = [
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

	// Save status tracking
	let isSaving = $state(false);
	let lastSaved = $state<Date | null>(null);

	// Track final review submission state
	let isSubmittingFinal = $state(false);
	let submitFinalError = $state('');

	// Track publication request state (after round 2)
	let isRequestingPublication = $state(false);
	let requestPublicationError = $state('');
	let isWithdrawingPublication = $state(false);
	let withdrawPublicationError = $state('');
	let showPublicationConfirm = $state(false);

	// Debounce function to avoid too many API calls
	let saveTimeout: NodeJS.Timeout | null = null;

	// Reactive statement to auto-save progress changes
	$effect(() => {
		// Only auto-save if there are items in progress (not on initial load)
		if (Object.keys(correctionProgress).length > 0) {
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
			saveTimeout = setTimeout(() => {
				saveCorrectionProgress();
			}, 1000); // Debounce for 1 second
		}
	});

	async function submitForFinalReview() {
		if (!paper?.id) return;
		isSubmittingFinal = true;
		submitFinalError = '';
		try {
			const resp = await fetch(`/api/papers/${paper.id}/submit-final-review`, {
				method: 'POST'
			});
			const result = await resp.json();
			if (!resp.ok) {
				submitFinalError = result.error || 'Failed to submit for final review';
				return;
			}
			// Update local status and move user to the review page
			paper = { ...paper, status: result.status || 'in review' } as Paper;
			await goto(`/publish/inreview/${paper.id}`);
		} catch (error) {
			console.error('Error submitting for final review', error);
			submitFinalError = 'Network error. Please try again.';
		} finally {
			isSubmittingFinal = false;
		}
	}

	async function submitForPublication() {
		if (!paper?.id) return;
		isRequestingPublication = true;
		requestPublicationError = '';
		try {
			const resp = await fetch(`/api/papers/${paper.id}/request-publication`, {
				method: 'POST'
			});
			const result = await resp.json();
			if (!resp.ok) {
				requestPublicationError = result.error || 'Failed to request publication';
				return;
			}
			paper = { ...paper, status: result.status || paper.status } as Paper;
			// If published immediately (no hub), go to published view; otherwise go back to dashboard
			if ((paper as any).status === 'published') {
				await goto(`/publish/published/${paper.id}`);
			} else {
				await goto(`/publish/`);
			}
		} catch (error) {
			console.error('Error requesting publication', error);
			requestPublicationError = 'Network error. Please try again.';
		} finally {
			isRequestingPublication = false;
		}
	}

	function openPublicationConfirm() {
		showPublicationConfirm = true;
	}

	function closePublicationConfirm() {
		showPublicationConfirm = false;
	}

	async function withdrawFromPublication() {
		if (!paper?.id) return;
		withdrawPublicationError = '';
		const ok = confirm('Are you sure you want to withdraw this paper from publication?');
		if (!ok) return;
		isWithdrawingPublication = true;
		try {
			const resp = await fetch(`/api/papers/${paper.id}/withdraw-publication`, {
				method: 'POST'
			});
			const result = await resp.json();
			if (!resp.ok) {
				withdrawPublicationError = result.error || 'Failed to withdraw from publication';
				return;
			}
			paper = { ...paper, status: result.status || 'draft' } as Paper;
			await goto(`/publish/`);
		} catch (error) {
			console.error('Error withdrawing from publication', error);
			withdrawPublicationError = 'Network error. Please try again.';
		} finally {
			isWithdrawingPublication = false;
		}
	}

	// Function to save correction progress to database
	async function saveCorrectionProgress() {
		if (isSaving) return; // Prevent multiple simultaneous saves

		isSaving = true;
		try {
			const response = await fetch(`/publish/corrections/${data.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'saveCorrectionProgress',
					correctionProgress
				})
			});

			const responseData = await response.json();

			if (response.ok) {
				lastSaved = new Date();
			} else {
				console.error('Erro ao salvar progresso:', responseData);
			}
		} catch (error) {
			console.error('Erro na requisição de salvamento:', error);
		} finally {
			isSaving = false;
		}
	}

	// Function to toggle correction completion
	function toggleCorrection(
		reviewIndex: number,
		type: 'weaknesses' | 'criterion',
		identifier: string
	) {
		const key = `${reviewIndex}-${type}-${identifier}`;
		correctionProgress[key] = !correctionProgress[key];

		// Force immediate save for testing
		saveCorrectionProgress();
	}

	// Function to calculate completion percentage
	function getCompletionPercentage(): number {
		const totalItems = Object.keys(correctionProgress).length;
		const completedItems = Object.values(correctionProgress).filter(Boolean).length;
		return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
	}

	// Function to get all unique weaknesses/areas for improvement
	function getAllCriticalComments(): string[] {
		const paperData = paper as Paper;
		if (!paperData.peer_review?.reviews) return [];

		const comments: string[] = [];
		paperData.peer_review.reviews.forEach((review: Review, index: number) => {
			if (review.qualitativeEvaluation?.weaknesses) {
				comments.push(`Review ${index + 1}: ${review.qualitativeEvaluation.weaknesses}`);
			}
		});
		return comments;
	}

	// Function to get lowest scoring criteria
	function getLowestScoringCriteria(): Array<{
		criterion: string;
		scores: number[];
		average: number;
	}> {
		const paperData = paper as Paper;
		if (!paperData.peer_review?.reviews) return [];

		const criteriaScores: Record<string, number[]> = {};

		paperData.peer_review.reviews.forEach((review: Review) => {
			if (review.quantitativeEvaluation) {
				Object.entries(review.quantitativeEvaluation).forEach(([criterion, score]) => {
					if (!criteriaScores[criterion]) criteriaScores[criterion] = [];
					criteriaScores[criterion].push(score as number);
				});
			}
		});

		return Object.entries(criteriaScores)
			.map(([criterion, scores]) => ({
				criterion: formatCriteriaName(criterion),
				scores,
				average: scores.reduce((sum, score) => sum + score, 0) / scores.length
			}))
			.filter((item) => item.average < 3.5) // Show criteria with average below 3.5
			.sort((a, b) => a.average - b.average);
	}

	// Function to count recommendations
	function getRecommendationSummary(): Record<string, number> {
		const paperData = paper as Paper;
		if (!paperData.peer_review?.reviews) return {};

		const summary: Record<string, number> = {};
		paperData.peer_review.reviews.forEach((review: Review) => {
			const rec = review.recommendation;
			summary[rec] = (summary[rec] || 0) + 1;
		});
		return summary;
	}

	async function handleSavePaper(event: { detail: { store: Paper } }) {
		const updatedPaper = event.detail.store;

		try {
			const response = await post(`/publish/edit/${updatedPaper.id}`, updatedPaper);

			if (response.paper) {
				goto(`/publish/`);
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.error(error);
			alert('An error occurred. Please try again.');
		}
	}

	// Nova função para salvar via PaperPublishPage
	async function savePaper(store: any) {
		try {
			const response = await post(`/publish/edit/${store.id}`, store);
			if (response.paper) {
				// Atualizar o paper local com as mudanças
				paper = response.paper;
				inicialValue = {
					...response.paper,
					mainAuthor: response.paper?.mainAuthor
				} as PaperPublishStoreData;

				// Sair do modo de edição
				isEditMode = false;
				alert('Article updated successfully!');
			} else {
				alert(`Issue! ${JSON.stringify(response)}`);
			}
		} catch (error) {
			alert('An error occurred. Please try again.');
		}
	}

	// Função para alternar modo de edição
	function toggleEditMode() {
		isEditMode = !isEditMode;
		if (isEditMode) {
			// Atualizar o valor inicial quando entrar no modo de edição
			inicialValue = {
				...(data.paper as any),
				mainAuthor: (data.paper as Paper)?.mainAuthor
			} as PaperPublishStoreData;
		}
	}

	async function hdlSubmitPublish(event: CustomEvent) {
		let { newMessage } = event.detail;
		newMessage = { ...newMessage, sender: newMessage.sender.id, _id: newMessage.id };

		try {
			const response = await fetch(`/publish/corrections/${data.id}`, {
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
</script>

<!-- Main Container -->
<div class="max-w-7xl mx-auto px-4 py-6">
	<!-- Debug section - remove after fixing -->
	<!-- <div class="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs">
		<h4 class="font-bold mb-2">Debug Information:</h4>
		<p><strong>Users count:</strong> {users?.length || 0}</p>
		<p><strong>First user sample:</strong> {JSON.stringify(users?.[0] || 'No users')}</p>
		<p><strong>Reviews count:</strong> {paper.peer_review?.reviews?.length || 0}</p>
		{#if paper.peer_review?.reviews?.length > 0}
			<p><strong>First review reviewerId:</strong> {JSON.stringify(paper.peer_review.reviews[0].reviewerId)}</p>
		{/if}
	</div> -->

	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900 mb-2 dark:text-slate-100">Article Corrections Required</h1>
		<p class="text-gray-600 dark:text-slate-300">
			Review the feedback from peer reviewers and make the necessary corrections to your article.
		</p>

		<!-- Barra de Progresso do Tempo de Correção -->
		<div class="mt-4">
			<CorrectionProgressBar {paper} {currentUser} showDetails={true} size="lg" />
		</div>

		<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-slate-900/70 dark:border-slate-700">
			<h3 class="font-semibold text-blue-800 mb-2 dark:text-slate-100">Article Information</h3>
			<div class="text-slate-900 dark:text-slate-200"><strong>Title:</strong> {@html cleanTitle((paper as Paper).title)}</div>
			<p class="text-slate-900 dark:text-slate-200"><strong>Status:</strong> <span class="capitalize">{(paper as Paper).status}</span></p>
			<p class="text-slate-900 dark:text-slate-200"><strong>Submitted:</strong> {new Date((paper as Paper).createdAt).toLocaleDateString()}</p>
		</div>

		<!-- Instructions for making corrections -->
		<div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
			<h3 class="text-base font-semibold text-slate-900 mb-2 dark:text-slate-100">How to Make Corrections</h3>
			<ol class="text-sm text-slate-700 space-y-1 list-decimal list-inside dark:text-slate-300">
				<li>Review the feedback and recommendations from reviewers below</li>
				<li>Click the "✏️ Edit Article" button in the article section to enter edit mode</li>
				<li>Make the necessary changes to address reviewer concerns</li>
				<li>Save your changes - they will be automatically applied to your article</li>
				<li>
					{#if (paper as any)?.reviewRound === 2}
						When ready, submit for publication or withdraw from publication
					{:else}
						When ready, submit for the second review round
					{/if}
				</li>
			</ol>

			{#if paper && ((paper as Paper).status === 'needing corrections' || (paper as Paper).status === 'under correction')}
				{#if (paper as any)?.reviewRound === 2}
					<div class="mt-4 flex flex-col md:flex-row md:items-center gap-3">
						<button
							class="btn preset-filled-primary-500"
							disabled={isRequestingPublication}
							onclick={openPublicationConfirm}
						>
							{#if isRequestingPublication}
								Submitting...
							{:else}
								Submit for Publication
							{/if}
						</button>
						<button
							class="btn preset-filled-surface-200"
							disabled={isWithdrawingPublication}
							onclick={withdrawFromPublication}
						>
							{#if isWithdrawingPublication}
								Withdrawing...
							{:else}
								Withdraw from Publication
							{/if}
						</button>
						{#if requestPublicationError}
							<span class="text-red-600 text-sm">{requestPublicationError}</span>
						{/if}
						{#if withdrawPublicationError}
							<span class="text-red-600 text-sm">{withdrawPublicationError}</span>
						{/if}
					</div>
				{:else}
					<div class="mt-4 flex items-center gap-3">
						<button
							class="btn preset-filled-primary-500"
							disabled={isSubmittingFinal}
							onclick={submitForFinalReview}
						>
							{#if isSubmittingFinal}
								Submitting...
							{:else}
								Submit for Final Review
							{/if}
						</button>
						{#if submitFinalError}
							<span class="text-red-600 text-sm">{submitFinalError}</span>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	{#if showPublicationConfirm}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				class="absolute inset-0 bg-black/50"
				onclick={closePublicationConfirm}
				aria-label="Close confirmation"
			></button>
			<div
				class="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
				role="dialog"
				aria-modal="true"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<h3 class="text-xl font-semibold text-gray-900">Confirm submission</h3>
						<p class="mt-1 text-sm text-gray-600">
							You are about to submit this paper for publication. Editing will be locked after
							submission.
						</p>
					</div>
					<button
						class="btn-icon btn-icon-sm"
						onclick={closePublicationConfirm}
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					<ul class="list-disc list-inside space-y-1">
						<li>Make sure all reviewer comments are addressed.</li>
						<li>Confirm the final version is ready to publish.</li>
						<li>This action cannot be undone.</li>
					</ul>
				</div>

				<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button class="btn preset-tonal dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onclick={closePublicationConfirm}>
						Cancel
					</button>
					<button
						class="btn preset-filled-primary-500"
						onclick={() => {
							closePublicationConfirm();
							submitForPublication();
						}}
						disabled={isRequestingPublication}
					>
						{#if isRequestingPublication}
							Submitting...
						{:else}
							Confirm and submit
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Critical Summary Section -->
	{#if paper && (paper as Paper)?.peer_review?.reviews?.length}
		<div class="mb-8 bg-white rounded-lg shadow-md p-6 dark:bg-slate-900 dark:border dark:border-slate-800">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4 dark:text-slate-100">Priority Corrections Summary</h2>

			<!-- Recommendation Overview -->
			<div class="mb-6">
				<h3 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">Reviewer Recommendations</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each Object.entries(getRecommendationSummary()) as [recommendation, count]}
						<div class="p-3 rounded-lg border {getRecommendationClass(recommendation)}">
							<div class="text-2xl font-bold">{count}</div>
							<div class="text-sm">{getRecommendationText(recommendation)}</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Areas Needing Most Attention -->
			{#if getLowestScoringCriteria().length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">
						Areas Requiring Most Attention
					</h3>
					<div class="space-y-3">
						{#each getLowestScoringCriteria() as { criterion, average, scores }}
							<div
								class="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg"
							>
								<div>
									<span class="font-semibold text-red-800">{criterion}</span>
									<span class="text-sm text-red-600 ml-2">
										(Scores: {scores.join(', ')})
									</span>
								</div>
								<div class="text-lg font-bold text-red-600">
									{average.toFixed(1)}/5.0
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- All Critical Comments -->
			{#if getAllCriticalComments().length > 0}
				<div class="mb-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">
						All Critical Comments to Address
					</h3>
					<div class="space-y-4">
						{#each getAllCriticalComments() as comment, index}
							<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<div class="flex items-start gap-3">
									<span
										class="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
									>
										{index + 1}
									</span>
									<div class="text-yellow-800 whitespace-pre-wrap flex-1">
										{comment}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Review Summary Section -->
	{#if paper && (paper as Paper)?.peer_review?.reviews?.length}
		<div class="mb-8 bg-white rounded-lg shadow-md p-6 dark:bg-slate-900 dark:border dark:border-slate-800">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4 dark:text-slate-100">
					Review Summary ({(paper as Paper).peer_review?.reviews?.length || 0} review{(
					paper as Paper
				).peer_review?.reviews?.length !== 1
					? 's'
					: ''})
			</h2>

			<!-- Overall Status -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<div class="bg-blue-50 p-4 rounded-lg">
					<h3 class="font-semibold text-blue-800">Average Score</h3>
					<p class="text-2xl font-bold text-blue-600">
						{(paper as Paper).peer_review?.averageScore
							? (paper as Paper).peer_review?.averageScore?.toFixed(1)
							: 'N/A'}/5.0
					</p>
				</div>
				<div class="bg-green-50 p-4 rounded-lg">
					<h3 class="font-semibold text-green-800">Reviews Completed</h3>
					<p class="text-2xl font-bold text-green-600">
						{(paper as Paper).peer_review?.reviewCount || 0}
					</p>
				</div>
				<div class="bg-purple-50 p-4 rounded-lg">
					<h3 class="font-semibold text-purple-800">Status</h3>
					<p class="text-lg font-medium text-purple-600 capitalize">
						{(paper as Paper).peer_review?.reviewStatus?.replace('_', ' ') || 'Unknown'}
					</p>
				</div>
			</div>

			<!-- Individual Reviews -->
			{#each (paper as Paper).peer_review?.reviews || [] as review, index}
				<div class="border border-gray-200 rounded-lg p-6 mb-6 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/70">
					<div class="flex justify-between items-start mb-4">
						<h3 class="text-xl font-semibold text-gray-800 dark:text-slate-100">
							Review #{index + 1}
						</h3>
						<div class="flex flex-col items-end gap-2">
							<span
								class="px-3 py-1 rounded-full text-sm font-medium {getRecommendationClass(
									review.recommendation
								)}"
							>
								{getRecommendationText(review.recommendation)}
							</span>
							{#if review.averageScore}
								<span class="text-lg font-bold text-gray-700">
									Score: {review.averageScore.toFixed(1)}/5.0
								</span>
							{/if}
						</div>
					</div>

					<!-- Reviewer Info -->
					<div class="mb-4 p-3 bg-white rounded border dark:bg-slate-900 dark:border-slate-700">
						<p class="text-sm text-gray-600 dark:text-slate-300">
							<strong>Reviewer:</strong>
							{getReviewerName(review.reviewerId)}
						</p>
						<!-- Debug info - remove this after fixing
						<p class="text-xs text-gray-400 mt-1">
							<strong>Debug - Reviewer ID:</strong> {JSON.stringify(review.reviewerId)}
						</p> -->
						{#if review.submissionDate}
							<p class="text-sm text-gray-600 dark:text-slate-300">
								<strong>Submitted:</strong>
								{new Date(review.submissionDate).toLocaleDateString()}
							</p>
						{/if}
					</div>

					<!-- Quantitative Scores -->
					{#if review.quantitativeEvaluation}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">Quantitative Evaluation</h4>
							<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
								{#each Object.entries(review.quantitativeEvaluation) as [criterion, score]}
									<div class="bg-white p-3 rounded border dark:bg-slate-900 dark:border-slate-700">
										<div class="text-sm font-medium text-gray-700 dark:text-slate-300">
											{formatCriteriaName(criterion)}
										</div>
										<div class="text-lg font-bold text-blue-600 dark:text-blue-400">{score}/5</div>
										<div class="w-full bg-gray-200 rounded-full h-2 mt-1 dark:bg-slate-700">
											<div
												class="bg-blue-600 h-2 rounded-full"
												style="width: {((score as number) / 5) * 100}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Qualitative Evaluation -->
					{#if review.qualitativeEvaluation}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">
								Detailed Reviewer Feedback
							</h4>

							{#if review.qualitativeEvaluation.strengths}
								<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-900">
									<h5 class="font-semibold text-green-800 mb-2 dark:text-emerald-200">
										Strengths Recognized by Reviewer
									</h5>
									<div class="text-green-700 whitespace-pre-wrap leading-relaxed dark:text-emerald-200">
										{review.qualitativeEvaluation.strengths}
									</div>
								</div>
							{/if}

							{#if review.qualitativeEvaluation.weaknesses}
								<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-rose-950/40 dark:border-rose-900">
									<h5 class="font-semibold text-red-800 mb-2 dark:text-rose-200">
										Critical Areas Requiring Attention
									</h5>
									<div class="text-red-700 whitespace-pre-wrap leading-relaxed dark:text-rose-200">
										{review.qualitativeEvaluation.weaknesses}
									</div>
									<div class="mt-3 p-3 bg-white border border-red-300 rounded dark:bg-slate-900 dark:border-rose-900">
										<h6 class="font-medium text-red-800 text-sm mb-1 dark:text-rose-200">Action Items:</h6>
										<ul class="text-sm text-red-700 space-y-1 dark:text-rose-200">
											<li>• Address each concern mentioned above in your revision</li>
											<li>• Provide clear explanations for any changes made</li>
											<li>• Consider adding supplementary information if needed</li>
										</ul>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if review.reviewAttachment}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-700 mb-3">Attached Review File</h4>
							<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
								<a
									class="font-medium text-blue-700 underline hover:text-blue-900"
									href={getReviewAttachmentUrl(review.reviewAttachment)}
									target="_blank"
									rel="noreferrer"
								>
									{review.reviewAttachment.filename}
									{#if review.reviewAttachment.fileSize}
										({formatFileSize(review.reviewAttachment.fileSize)})
									{/if}
								</a>
							</div>
						</div>
					{/if}

					<!-- Ethics Review -->
					{#if review.ethics}
						<div class="mb-6">
							<h4 class="text-lg font-semibold text-gray-800 mb-3 dark:text-slate-200">Ethics Review</h4>
							<div class="bg-white p-4 rounded border dark:bg-slate-900 dark:border-slate-700">
								{#if review.ethics.involvesHumanResearch}
									<p class="mb-2">
										<strong>Involves Human Research:</strong>
										<span class="capitalize">{review.ethics.involvesHumanResearch}</span>
									</p>
								{/if}
								{#if review.ethics.ethicsApproval}
									<p>
										<strong>Ethics Approval:</strong>
										<span class="capitalize">{review.ethics.ethicsApproval.replace('_', ' ')}</span>
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Review Status -->
					<div class="flex justify-between items-center pt-4 border-t border-gray-200">
						<span class="text-sm text-gray-500">
							Status: <span class="capitalize font-medium">{review.status}</span>
						</span>
						{#if review.completionDate}
							<span class="text-sm text-gray-500">
								Completed: {new Date(review.completionDate).toLocaleDateString()}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
			<div class="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6 dark:bg-amber-950/40 dark:border-amber-900">
				<h2 class="text-xl font-semibold text-yellow-800 mb-2 dark:text-amber-200">No Reviews Available</h2>
			<p class="text-yellow-700">
				No peer review data is currently available for this article. Please contact the editorial
				team if you believe this is an error.
			</p>
		</div>
	{/if}

	<!-- Action Items Section -->
	<div class="mb-8 bg-white rounded-lg shadow-md p-6 dark:bg-slate-900 dark:border dark:border-slate-800">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-slate-100">Correction Checklist</h2>
			<div class="flex items-center gap-4">
				<div class="text-sm text-gray-600">
					Progress: {getCompletionPercentage()}% complete
				</div>
				<div class="w-32 bg-gray-200 rounded-full h-2">
					<div
						class="bg-green-600 h-2 rounded-full transition-all duration-300"
						style="width: {getCompletionPercentage()}%"
					></div>
				</div>
				<!-- Save status indicator -->
				{#if isSaving}
					<div class="flex items-center gap-1 text-sm text-blue-600">
						<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Saving...
					</div>
				{:else if lastSaved}
					<div class="text-sm text-green-600">
						✓ Saved {lastSaved.toLocaleTimeString()}
					</div>
				{/if}
			</div>
		</div>

		{#if paper && (paper as Paper)?.peer_review?.reviews?.length}
			<div class="space-y-6">
				{#each (paper as Paper).peer_review?.reviews || [] as review, reviewIndex}
					<div class="border border-gray-200 rounded-lg p-4">
						<h3 class="font-semibold text-gray-800 mb-3">Review #{reviewIndex + 1} Corrections</h3>

						<!-- Low-scoring criteria to address -->
						{#if review.quantitativeEvaluation}
							{#each Object.entries(review.quantitativeEvaluation) as [criterion, score]}
								{#if (score as number) < 3.5}
									<div class="flex items-center gap-3 p-2 mb-2 bg-orange-50 rounded">
										<input
											type="checkbox"
											id="criterion-{reviewIndex}-{criterion}"
											bind:checked={correctionProgress[`${reviewIndex}-criterion-${criterion}`]}
											class="w-4 h-4 text-blue-600"
										/>
										<label for="criterion-{reviewIndex}-{criterion}" class="flex-1 text-sm">
											<span class="font-medium">Improve {formatCriteriaName(criterion)}</span>
											<span class="text-orange-600">(scored {score}/5)</span>
										</label>
									</div>
								{/if}
							{/each}
						{/if}

						<!-- Critical comments to address -->
						{#if review.qualitativeEvaluation?.weaknesses}
							<div class="flex items-start gap-3 p-2 mb-2 bg-red-50 rounded">
								<input
									type="checkbox"
									id="weakness-{reviewIndex}"
									bind:checked={correctionProgress[`${reviewIndex}-weaknesses-main`]}
									class="w-4 h-4 text-blue-600 mt-1"
								/>
								<label for="weakness-{reviewIndex}" class="flex-1 text-sm">
									<span class="font-medium text-red-800">Address critical feedback:</span>
									<div class="text-red-700 mt-1 text-xs">
										{review.qualitativeEvaluation.weaknesses.substring(0, 150)}...
									</div>
								</label>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-600">No specific actions required at this time.</p>
		{/if}
	</div>

	<!-- Helpful Tips Section -->
	<div
		class="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800"
	>
		<h2 class="text-2xl font-semibold text-slate-900 mb-4 dark:text-slate-100">
			Tips for Making Effective Corrections
		</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div>
				<h3 class="font-semibold text-slate-900 mb-3 dark:text-slate-100">General Guidelines</h3>
				<ul class="space-y-2 text-slate-600 text-sm dark:text-slate-300">
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Address each reviewer comment systematically
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Be specific about changes made in response to feedback
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Maintain the academic tone and structure
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Double-check all citations and references
					</li>
				</ul>
			</div>
			<div>
				<h3 class="font-semibold text-slate-900 mb-3 dark:text-slate-100">Priority Areas</h3>
				<ul class="space-y-2 text-slate-600 text-sm dark:text-slate-300">
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Focus on criteria scored below 3.5 first
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Address all "weaknesses" comments thoroughly
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Strengthen methodology and results sections
					</li>
					<li class="flex items-start gap-2">
						<span class="text-slate-400 mt-1 dark:text-slate-500">•</span>
						Improve clarity and readability where noted
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Paper Content Section -->
	<div class="bg-white rounded-lg shadow-md dark:bg-slate-900 dark:border dark:border-slate-800">
		<div class="p-6 border-b border-gray-200">
			<div class="flex justify-between items-center">
				<div>
					<h2 class="text-2xl font-semibold text-gray-900 dark:text-slate-100">Your Article</h2>
					<p class="text-gray-600 mt-1">
						{#if isEditMode}
							Edit your article content based on reviewer feedback.
						{:else}
							Review your article content and make necessary corrections based on reviewer feedback.
						{/if}
					</p>
				</div>
				<div class="flex flex-col items-end gap-2">
					<div class="flex gap-2">
						{#if isEditMode}
							<button
								class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
								onclick={() => (isEditMode = false)}
							>
								Cancel Edit
							</button>
						{:else}
							<button
								class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
								onclick={toggleEditMode}
							>
								Edit Article
							</button>
						{/if}
						<button
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
						>
							Back to Review Summary
						</button>
					</div>
					<span class="text-sm text-gray-500">
						{getCompletionPercentage()}% corrections completed
					</span>
				</div>
			</div>
		</div>

		<div class="p-6">
			{#if isEditMode}
				<!-- Modo de edição com PaperPublishPage -->
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6 dark:bg-amber-950/40 dark:border-amber-900">
					<h3 class="font-semibold text-amber-900 mb-2 dark:text-amber-200">Edit Mode Active</h3>
					<p class="text-yellow-700 text-sm dark:text-amber-200">
						You are now editing your article. Make the necessary changes based on reviewer feedback
						above, then save your changes. The article will remain in corrections status until
						you're ready to resubmit.
					</p>
				</div>
				<PaperPublishPage
					{savePaper}
					{inicialValue}
					author={currentUser as User}
					authorsOptions={userProfiles}
				/>
			{:else}
				<!-- Modo de visualização com PaperReviewPage -->
				<PaperReviewPage paper={paper as Paper} currentUser={currentUser as User} {messageFeed} />
			{/if}
		</div>
	</div>
</div>
