<script lang="ts">
	import PaperAuthorsSection from '$lib/components/Paper/PaperAuthorsSection.svelte';
	import SupplementaryMaterials from '$lib/components/SupplementaryMaterials.svelte';
	import SupplementaryFiles from '$lib/components/SupplementaryFiles.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
 	import { enhancePaperReferenceLinks } from '$lib/utils/paperHtmlPresentation';

	// Receber os dados do servidor
	export let data: PageData;

	// Usar o paper diretamente (não filtrar por status)
	let paper: any = null;
	$: paper = data.paper as any;
	let currentUser: any = data.user as any;
	let canViewCorrections = data.canViewCorrections === true;

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

	function getReviewAttachmentUrl(attachment: any): string {
		return `/api/reviews/attachments/${encodeURIComponent(attachment.fileId || attachment.id)}`;
	}

	function formatFileSize(bytes?: number): string {
		if (!bytes) return '';
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	onMount(() => {
		enhancePaperReferenceLinks(document.body);
	});
</script>

<!-- Lista de Papers -->
<div class="space-y-6 max-w-[900px] ml-6">
	{#if paper}
		<div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
			<!-- Status Badge -->
			{#if paper.status !== 'published'}
				<div class="mb-4">
					{#if paper.rejectedByHub || paper.status === 'rejected'}
						<span class="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 text-sm font-medium rounded-lg">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
							</svg>
							Paper Rejected
						</span>
					{:else if paper.status === 'reviewer assignment'}
						<span class="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
							Reviewer Assignment
						</span>
					{:else}
						<span class="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
							Status: {paper.status}
						</span>
					{/if}
				</div>
			{/if}

			<!-- Rejection Reason -->
			{#if (paper.rejectedByHub || paper.status === 'rejected') && paper.rejectionReason}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
					<p class="text-sm text-red-800">{paper.rejectionReason}</p>
					{#if paper.rejectedAt}
						<p class="text-xs text-red-600 mt-2">
							Rejected on {new Date(paper.rejectedAt).toLocaleDateString()}
						</p>
					{/if}
				</div>
			{/if}

			<!-- Hub Info (if exists) -->
			{#if paper.hubId && paper.isLinkedToHub}
				<div class="flex flex-col gap-1 mb-2">
					<span class="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded w-fit">
						{typeof paper.hubId === 'object' && paper.hubId !== null && 'type' in paper.hubId
							? paper.hubId.type.toUpperCase() + ' PAPER'
							: 'Hub'}
					</span>
					<span class="text-xs text-gray-600 ml-2">
						<a
							href={`/hub/view/${typeof paper.hubId === 'object' && paper.hubId !== null && '_id' in paper.hubId ? paper.hubId._id : paper.hubId}`}
							class="text-primary-500 hover:text-primary-700"
						>
							{typeof paper.hubId === 'object' && paper.hubId !== null && 'title' in paper.hubId
								? paper.hubId.title
								: 'Unknown Hub'}
						</a>
					</span>
				</div>
			{/if}

			<!-- Título do Paper -->
			<h2 class="text-3xl font-semibold text-gray-800 mb-4">{@html paper.title}</h2>

			<PaperAuthorsSection paper={paper} rootClass="mb-4" />

			<span class="text-xs">Created: {new Date(paper.createdAt).toDateString()}</span>

			<!-- Imagem Principal -->
			{#if paper.paperPictures && paper.paperPictures.length > 0}
				<img
					src={`/api/images/${paper.paperPictures[0]}`}
					alt="Imagem do artigo"
					class="w-full h-full object-cover rounded-sm mb-4"
				/>
			{:else}
				<!-- Placeholder caso não haja imagem -->
				<div
					class="bg-gray-300 w-full h-48 rounded-sm flex items-center justify-center text-gray-500 mb-4"
				>
					<span>No image available</span>
				</div>
			{/if}

			<!-- Corpo do Texto (Abstract) -->
			<h2 class="mt-4 text-surface-900 font-bold prose text-2xl max-w-none">Abstract</h2>

			<div class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg paper-content">
				{@html paper.abstract}
			</div>

			<!-- Corpo do Texto (Content) -->
			<div
				class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 paper-content"
			>
				{@html paper.content}
			</div>

			<!-- Supplementary Materials Section -->
			{#if paper.supplementaryMaterials && paper.supplementaryMaterials.length > 0}
				<div class="mt-6">
					<SupplementaryMaterials materials={paper.supplementaryMaterials} />
				</div>
			{/if}

			<!-- Tags/Keywords -->
						<!-- Supplementary Files Section -->
						{#if paper.supplementaryFiles && paper.supplementaryFiles.length > 0}
							<div class="mt-6">
								<SupplementaryFiles files={paper.supplementaryFiles} allowDownload={true} />
							</div>
						{/if}

						<!-- Tags/Keywords -->
			{#if paper.keywords && paper.keywords.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each paper.keywords as keyword}
						<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
							{keyword}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		{#if canViewCorrections && getReviewsForDisplay().length}
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

							{#if review?.reviewAttachment}
								<div class="mt-3 rounded-md bg-white p-3">
									<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachment</div>
									<a
										href={getReviewAttachmentUrl(review.reviewAttachment)}
										target="_blank"
										rel="noreferrer"
										class="mt-1 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
									>
										{review.reviewAttachment.filename}
										{#if review.reviewAttachment.fileSize}
											({formatFileSize(review.reviewAttachment.fileSize)})
										{/if}
									</a>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Se não houver paper -->
{#if !paper}
	<div class="text-center py-10">
		<p class="text-gray-600">Paper not found.</p>
	</div>
{/if}

<!-- Skeleton Loading (Placeholder) -->
{#if !data}
	<div class="space-y-6">
		{#each [1, 2, 3] as _}
			<div class="p-6 bg-white rounded-lg shadow-lg animate-pulse">
				<div class="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
				<div class="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
				<div class="h-4 bg-gray-300 rounded w-5/6"></div>
			</div>
		{/each}
	</div>
{/if}
