<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	//AKIIIIIIIIIIIIIII
	import ReviewChat from '$lib/components/review/ReviewChat.svelte';
	// import { Types } from 'mongoose';

	import type { MessageFeed } from '$lib/types/MessageFeed';
	import type { Paper } from '$lib/types/Paper';
	import type { User } from '$lib/types/User';
	import { createEventDispatcher } from 'svelte';
	import ReviewForms from '../Review/ReviewForms.svelte';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';
	import PublishedPaperView from '$lib/components/Paper/PublishedPaperView.svelte';

	const dispatch = createEventDispatcher();

	function handleReviewSubmitted(event: CustomEvent) {
		// Forward the event to the parent page component
		dispatch('reviewSubmitted', event.detail);
	}

	// interface MessageFeed {
	// 	id: number; //trocar por uuid
	// 	host: boolean; //trocar por user
	// 	avatar: any; //trocar por user
	// 	name: string; //trocar por user
	// 	timestamp: string;
	// 	message: string;
	// }
	// const user1 = {
	// 	firstName: 'Almir',
	// 	lastName: 'Sater',
	// 	country: 'Brazil',
	// 	dob: '1956-09-14',
	// 	email: 'almirsater@gmail.com',
	// 	password:
	// 		'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
	// 	darkMode: false,
	// 	roles: {
	// 		author: true,
	// 		reviewer: true
	// 	},
	// 	bio: 'Almir Eduardo Melke Sater é um violeiro, cantor, compositor, ator e instrumentista brasileiro. Participou de diversos shows e festivais de música e, nos anos 1990, ao aceitar convites para representar em novelas "personagens de violeiro", se tornou conhecido nacionalmente como cantor e ator.',
	// 	profilePictureUrl:
	// 		'https://s2-g1.glbimg.com/F_t89bo5eGapJ7Fn8X-jdgOeI5I=/0x0:652x482/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/Y/Q/t6pMmUQvAgTNLoofL7tQ/agendao-cultural.jpg',
	// 	institution: 'Universidade Cândido Mendes',
	// 	position: 'Violeiro',
	// 	performanceReviews: {
	// 		averageReviewDays: 0,
	// 		recommendations: [],
	// 		responseTime: 0,
	// 		expertise: []
	// 	},
	// 	connections: [],
	// 	followers: [],
	// 	followersCount: 0,
	// 	following: [],
	// 	followingCount: 0,
	// 	createdAt: new Date('2024-08-26T14:11:28.456Z'),
	// 	updatedAt: new Date('2024-09-02T20:51:55.385Z'),
	// 	id: '22ae9df6-8ac3-4a7f-9135-bbe888217b5d',
	// 	username: '@almirsater',
	// 	papers: []
	// };
	// const user2 = {
	// 	firstName: 'Renato',
	// 	lastName: 'Teixeira',
	// 	country: 'Brazil',
	// 	dob: '1945-05-20',
	// 	username: '@renatoteixeira',
	// 	email: 'renatoteixeira@gmail.com',
	// 	password:
	// 		'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
	// 	darkMode: false,
	// 	roles: {
	// 		author: true,
	// 		reviewer: false
	// 	},
	// 	bio: '',
	// 	profilePictureUrl:
	// 		'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQcb5RJVepOCcdoz2eTtqM9rwLZ-ktJTBU3n4xBQ0W-V8mVJjet',
	// 	institution: '',
	// 	position: '',
	// 	performanceReviews: {
	// 		averageReviewDays: 0,
	// 		recommendations: [],
	// 		responseTime: 0,
	// 		expertise: []
	// 	},
	// 	connections: [],
	// 	followers: [],
	// 	followersCount: 0,
	// 	following: [],
	// 	followingCount: 0,
	// 	publications: [],
	// 	createdAt: new Date('2024-08-26T14:13:01.639Z'),
	// 	updatedAt: new Date('2024-08-26T14:13:01.639Z'),
	// 	id: '1f0d35ef-afaa-4d1c-afbd-fa8d16b6b23d',
	// 	papers: []
	// };
	// const lorem = faker.lorem.paragraph();
	// 	id: '597c84b3-d2a8-4fcc-950e-7ffff8739650',
	// 	messages: [
	// 		{
	// 			id: '1ce92d03-1eae-45e7-beff-9ac8af566474',
	// 			sender: user1,
	// 			timestamp: 'Yesterday @ 2:30pm',
	// 			message: 'lorem',
	// 			isRead: true,
	// 			color: 'variant-soft-primary'
	// 		}
	// 	]
	// };

	let currentMessage = '';

	// export let data = {
	// 	messageFeed,
	// 	currentMessage
	// };

	interface Props {
		messageFeed: any;
		paper: any;
		editable?: boolean;
		currentUser?: User;
		reviewAssignments?: any[];
		isHubAdmin?: boolean;
		canSubmitReview?: boolean;
		canViewSubmittedReviews?: boolean;
	}

	let {
		messageFeed,
		paper,
		editable = false,
		currentUser,
		reviewAssignments,
		isHubAdmin = false,
		canSubmitReview = false,
		canViewSubmittedReviews = false
	}: Props = $props();

	let isReviewCollapsed = $state(false);
	let generatedPdfId = $state<string>(paper?.pdfUrl ?? '');
	let isGeneratingPdf = $state(false);
	let generatePdfError = $state<string | null>(null);

	function getReviewRound(review: any): number {
		const round = Number(review?.reviewRound ?? review?.round ?? 1);
		return round === 2 || round === 3 ? 2 : 1;
	}

	function getReviewerName(review: any): string {
		const reviewer = review?.reviewerId;
		if (reviewer && typeof reviewer === 'object') {
			const firstName = String(reviewer.firstName ?? '').trim();
			const lastName = String(reviewer.lastName ?? '').trim();
			const fullName = `${firstName} ${lastName}`.trim();
			if (fullName) return fullName;
			const username = String(reviewer.username ?? '').trim();
			if (username) return username;
			const email = String(reviewer.email ?? '').trim();
			if (email) return email;
		}
		return 'Unknown reviewer';
	}

	function getRecommendationLabel(value: string): string {
		const labels: Record<string, string> = {
			accept_without_changes: 'Accept without changes',
			accept_with_minor_revisions: 'Accept with minor revisions',
			major_revision: 'Major revision',
			reject: 'Reject'
		};

		return labels[value] || value || 'Not selected';
	}

	function getEthicsLabel(value: string): string {
		const labels: Record<string, string> = {
			yes: 'Yes',
			no: 'No',
			adequate: 'Adequate',
			justified: 'Justified',
			absent: 'Absent'
		};

		return labels[value] || value || 'Not provided';
	}

	const quantitativeFields = [
		{ key: 'originality', label: 'Originality' },
		{ key: 'clarity', label: 'Clarity' },
		{ key: 'literatureReview', label: 'Literature review' },
		{ key: 'theoreticalFoundation', label: 'Theoretical foundation' },
		{ key: 'methodology', label: 'Methodology' },
		{ key: 'reproducibility', label: 'Reproducibility' },
		{ key: 'results', label: 'Results' },
		{ key: 'figures', label: 'Figures' },
		{ key: 'limitations', label: 'Limitations' },
		{ key: 'language', label: 'Language' },
		{ key: 'impact', label: 'Impact' }
	];

	function getReviewsForDisplay() {
		const reviews = Array.isArray(paper?.peer_review?.reviews) ? paper.peer_review.reviews : [];
		return [...reviews].sort((left, right) => {
			const leftDate = new Date(left?.submissionDate ?? left?.createdAt ?? 0).getTime();
			const rightDate = new Date(right?.submissionDate ?? right?.createdAt ?? 0).getTime();
			return rightDate - leftDate;
		});
	}

	function handleReviewCollapse(event: CustomEvent<{ collapsed: boolean }>) {
		isReviewCollapsed = event.detail?.collapsed ?? false;
	}

	function hdlSaveDraft(e: any) {
		//Fz um put que atualiza currentMessage
		currentMessage = e.detail.currentMessage;
	}

	// 	dispatch('sendMessage');
	// 	// currentMessage = '';
	// 	//}
	// }
	//

	function hdlSubmitReview(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}

	function handleOpenPdfPreview() {
		if (!generatedPdfId) return;

		const url = `/api/pdfs/${encodeURIComponent(generatedPdfId)}?download=0`;
		const win = window.open(url, '_blank');
		if (!win) {
			alert('Allow pop-ups in the browser to open the PDF.');
		}
	}

	async function generateServerPdf(force = false) {
		const paperId = String(paper?.id ?? '').trim();
		if (!paperId || isGeneratingPdf) return;

		isGeneratingPdf = true;
		generatePdfError = null;

		try {
			const response = await fetch(`/api/pdfs/generate/${encodeURIComponent(paperId)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force })
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(payload?.message || 'Failed to generate PDF');
			}

			const payload = (await response.json()) as { pdfId?: string };
			if (payload?.pdfId) {
				generatedPdfId = payload.pdfId;
			}
		} catch (error) {
			generatePdfError = error instanceof Error ? error.message : 'Failed to generate PDF';
		} finally {
			isGeneratingPdf = false;
		}
	}

	onMount(() => {
		void generateServerPdf(true);
	});
</script>

<main class="w-full max-w-none px-0 sm:px-2 md:px-4">
	<fieldset class="py-3 md:py-6">
		<!-- Barra de Progresso do Tempo de Revisão -->
		{#if paper.status === 'in review' || paper.status === 'needing corrections'}
			<div class="mb-6">
				<CorrectionProgressBar
					{paper}
					{currentUser}
					showDetails={true}
					size="lg"
					{reviewAssignments}
				/>
			</div>
		{/if}

		{#if editable}
			<div class="flex justify-end gap-3 mb-4">
				<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}
					>Save Draft</button
				>
				<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmitReview}
					>Submit Article</button
				>
			</div>
		{/if}

		<!-- Role-based rendering: reviewers get PDF + review form; authors/editors/admins can observe submitted reviews -->
		{#if canSubmitReview}
			<div class="mb-8 {isHubAdmin ? 'w-full' : 'flex flex-col gap-4 w-full xl:flex-row'}">
				<!-- PDF à esquerda -->
				<section
					class={isHubAdmin
						? 'w-full'
						: isReviewCollapsed
							? 'w-full min-w-0 xl:flex-[4_1_0%]'
							: 'w-full min-w-0 xl:flex-[1_1_0%]'}
				>
					<div class="bg-white p-0 shadow-lg sm:rounded-lg sm:p-2 md:p-4">
						<div
							class="mb-2 flex flex-col gap-3 px-2 pt-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:pt-0"
						>
							<h3 class="text-lg font-semibold text-slate-800">Paper PDF</h3>
							<div class="flex flex-col gap-2 min-[420px]:flex-row sm:items-center">
								<!-- Regenerate PDF button hidden (manual override). -->
								<!--
								<button
									type="button"
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 min-[420px]:w-auto"
									onclick={() => generateServerPdf(true)}
									disabled={isGeneratingPdf}
								>
									{isGeneratingPdf ? 'Generating PDF...' : 'Regenerate PDF'}
								</button>
								-->
								<button
									type="button"
									class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 min-[420px]:w-auto"
									onclick={handleOpenPdfPreview}
									disabled={!generatedPdfId}
								>
									Open in new tab
								</button>
							</div>
						</div>

						{#if generatePdfError}
							<p class="mb-2 text-sm text-red-600">{generatePdfError}</p>
						{/if}

						{#if generatedPdfId}
							<div
								class="h-[125dvh] w-full overflow-hidden border border-gray-300 sm:h-[90dvh] lg:h-[86vh] xl:h-[calc(100vh-10rem)]"
							>
								<iframe
									src={`/api/pdfs/${generatedPdfId}#view=FitH&zoom=page-width`}
									title="PDF file"
									frameborder="1"
									class="h-full w-full border-0"
								></iframe>
							</div>
						{:else}
							<div
								class="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-slate-600"
							>
								{isGeneratingPdf
									? 'Generating Paper PDF...'
									: 'No PDF generated for this paper yet.'}
							</div>
						{/if}
					</div>
				</section>

				<!-- ReviewForms à direita (apenas para revisores, não para admin do hub) -->
				{#if !isHubAdmin}
					<section
						class={isReviewCollapsed
							? 'w-full xl:w-[300px] flex-none min-w-0'
							: 'w-full xl:w-[460px] flex-none min-w-0'}
					>
						{#if page.url.pathname.startsWith('/review/inreview/') || page.url.pathname.startsWith('/review/correction/')}
							<ReviewForms
								paperTitle={paper.title}
								paperId={paper.id}
								reviewerId={currentUser?.id || ''}
								{paper}
								on:collapseToggle={handleReviewCollapse}
								on:reviewSubmitted={handleReviewSubmitted}
							/>
						{/if}
					</section>
				{/if}
			</div>
		{/if}

		{#if canViewSubmittedReviews}
			{#if !canSubmitReview}
				<div class="mb-8">
					<PublishedPaperView {paper} showReviewedBadge={false} />
				</div>
			{/if}

			{#if getReviewsForDisplay().length}
				<div class="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
					<h3 class="mb-4 text-base font-semibold text-slate-900">Reviews received so far</h3>
					<div class="space-y-4">
						{#each getReviewsForDisplay() as review, index (review.id || review._id || index)}
							<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div>
										<div class="font-semibold text-slate-900">{getReviewerName(review)}</div>
										<div class="text-xs text-slate-500">Round {getReviewRound(review)}</div>
									</div>
									<div class="text-xs text-slate-500">
										{#if review?.submissionDate}
											Submitted {new Date(review.submissionDate).toLocaleString()}
										{/if}
									</div>
								</div>

								<div class="mt-3 grid gap-3 md:grid-cols-2">
									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Recommendation
										</div>
										<div class="mt-1 text-sm font-medium text-slate-800">
											{getRecommendationLabel(review?.recommendation)}
										</div>
									</div>
									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Scores</div>
										<div class="mt-1 text-sm text-slate-800">
											Average: {review?.averageScore ?? '-'} | Weighted: {review?.weightedScore ?? '-'}
										</div>
									</div>
								</div>

								<div class="mt-3 grid gap-3 md:grid-cols-2">
									<div class="rounded-md bg-white p-3 md:col-span-2">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Detailed quantitative scores
										</div>
										<div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
											{#each quantitativeFields as field}
												<div class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
													<div class="text-xs uppercase tracking-wide text-slate-500">{field.label}</div>
													<div class="mt-1 text-sm font-medium text-slate-900">
														{review?.quantitativeEvaluation?.[field.key] ?? '—'}/5
													</div>
												</div>
											{/each}
										</div>
									</div>

									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Strengths</div>
										<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">
											{review?.qualitativeEvaluation?.strengths || '-'}
										</p>
									</div>
									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Weaknesses</div>
										<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">
											{review?.qualitativeEvaluation?.weaknesses || '-'}
										</p>
									</div>
								</div>

								<div class="mt-3 grid gap-3 md:grid-cols-2">
									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ethics - Human research</div>
										<div class="mt-1 text-sm text-slate-800">{getEthicsLabel(review?.ethics?.involvesHumanResearch)}</div>
									</div>
									<div class="rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ethics - Approval</div>
										<div class="mt-1 text-sm text-slate-800">{getEthicsLabel(review?.ethics?.ethicsApproval ?? '')}</div>
									</div>
								</div>

								{#if review?.reviewAttachment}
									<div class="mt-3 rounded-md bg-white p-3">
										<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Attachment
										</div>
										<a
											href={`/api/reviews/attachments/${encodeURIComponent(review.reviewAttachment.fileId || review.reviewAttachment.id)}`}
											target="_blank"
											rel="noreferrer"
											class="mt-1 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
										>
											Open attachment
										</a>
									</div>
								{/if}

								<div class="mt-3 rounded-md bg-slate-100 p-3">
									<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Submission date</div>
									<div class="mt-1 text-sm text-slate-800">
										{#if review?.submissionDate}
											{new Date(review.submissionDate).toLocaleString()}
										{:else}
											Not available
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			{#if !canSubmitReview}
				<div class="mb-8">
					<PublishedPaperView {paper} showReviewedBadge={false} />
				</div>
			{/if}
		{/if}
	</fieldset>
</main>
<!-- <ReviewForms

    {editable}
    {currentUser}
    on:saveDraft={hdlSaveDraft}
    on:submitReview={hdlSubmitReview}
></ReviewForms> -->
<!-- <ReviewForms paperTitle={paper.title} /> -->
