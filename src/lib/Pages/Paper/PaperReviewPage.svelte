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

	// console.log('44444',messageFeed)
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
	}

	let {
		messageFeed,
		paper,
		editable = false,
		currentUser,
		reviewAssignments,
		isHubAdmin = false
	}: Props = $props();

	let isReviewCollapsed = $state(false);
	let generatedPdfId = $state<string>(paper?.pdfUrl ?? '');
	let isGeneratingPdf = $state(false);
	let generatePdfError = $state<string | null>(null);

	function isUserReviewer() {
		if (!currentUser) return false;
		if (currentUser.roles?.reviewer) return true;
		if (Array.isArray(reviewAssignments) && reviewAssignments.some((r) => r.reviewerId === currentUser.id)) return true;
		if (Array.isArray(paper?.reviewers) && paper.reviewers.includes(currentUser.id)) return true;
		return false;
	}

	function handleReviewCollapse(event: CustomEvent<{ collapsed: boolean }>) {
		isReviewCollapsed = event.detail?.collapsed ?? false;
	}
	// console.log('current', currentUser);
	// console.log('Reviewers', paper.reviewers);

	function hdlSaveDraft(e: any) {
		console.log('current message:', e.detail.currentMessage);
		//Fz um put que atualiza currentMessage
		currentMessage = e.detail.currentMessage;
	}

	// function hdlSubmitReview(e: any) {
	// 	console.log('asdas',e.detail);
	// 	//Fz um put que:
	// 	//1) atualiza os campos enviados em e.detail
	// 	//2) Muda status do paper
	// }
	// function hdlSubmitReview(e: any) {
	// 	//if (currentMessage.trim()) {
	// 	console.log('aquiAQUIaqui:', e.detail);
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

<main class="w-full max-w-none px-2 md:px-4">
	<fieldset class="py-4 md:py-6">
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

		<!-- Role-based rendering: reviewers get PDF + review form; others see HTML PublishedPaperView -->
		{#if isUserReviewer()}
			<div class="mb-8 {isHubAdmin ? 'w-full' : 'flex flex-col gap-4 w-full lg:flex-row'}">
				<!-- PDF à esquerda -->
				<section
					class={isHubAdmin
						? 'w-full'
						: isReviewCollapsed
							? 'w-full min-w-0 lg:flex-[3_1_0%]'
							: 'w-full min-w-0 lg:flex-1'}
				>
					<div class="p-4 md:p-6 bg-white rounded-lg shadow-lg">
						<div class="mb-2 flex items-center justify-between gap-3">
						<h3 class="text-lg font-semibold text-slate-800">Paper PDF</h3>
							<div class="flex items-center gap-2">
								<button
									type="button"
									class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
									onclick={() => generateServerPdf(true)}
									disabled={isGeneratingPdf}
								>
									{isGeneratingPdf ? 'Generating PDF...' : 'Regenerate PDF'}
								</button>
								<button
									type="button"
									class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
							<div class="border border-gray-300 p-2 md:p-4 h-[80vh] w-full">
								<iframe
									src={`/api/pdfs/${generatedPdfId}`}
									title="PDF file"
									frameborder="1"
									class="h-full w-full"
								></iframe>
							</div>
						{:else}
							<div class="border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-slate-600">
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
							? 'w-full lg:w-[300px] flex-none min-w-0'
							: 'w-full lg:w-[520px] flex-none min-w-0'}
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
		{:else}
			<div class="mb-8">
				<PublishedPaperView {paper} showReviewedBadge={false} />
			</div>
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
