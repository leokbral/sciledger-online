<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import SupplementaryMaterials from '$lib/components/SupplementaryMaterials.svelte';
	import { onMount } from 'svelte';

	interface Props {
		paper: any;
		showReviewedBadge?: boolean;
	}

	let { paper, showReviewedBadge = false }: Props = $props();

	function getDisplayName(author: any): string {
		if (!author || typeof author !== 'object') return 'Unknown author';
		const first = String(author.firstName ?? '').trim();
		const last = String(author.lastName ?? '').trim();
		const fullName = `${first} ${last}`.trim();
		return fullName || 'Unknown author';
	}

	function getInitials(name: string): string {
		const parts = name.split(' ').filter(Boolean);
		if (parts.length === 0) return 'NA';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}

	function getProfileUrl(author: any): string | null {
		if (!author || typeof author !== 'object') return null;
		const username = String(author.username ?? '').trim();
		return username ? `/profile/${username}` : null;
	}

	function styleReferenceLinks() {
		if (typeof window === 'undefined') return;

		const contentElements = document.querySelectorAll('.paper-content');
		contentElements.forEach((element) => {
			const html = element.innerHTML;
			const styledHtml = html.replace(
				/\[(\d+)\]/g,
				'<span class="reference-link text-primary-500 hover:text-primary-950 cursor-pointer font-medium">[<span class="reference-number">$1</span>]</span>'
			);
			element.innerHTML = styledHtml;
		});
	}

	onMount(() => {
		styleReferenceLinks();
	});
</script>

<div class="space-y-6 max-w-[900px] ml-6">
	{#if paper}
		<div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
			<div class="flex flex-col gap-1 mb-2">
				{#if showReviewedBadge}
					<span class="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
						✓ REVIEWED BY YOU
					</span>
				{/if}
				{#if paper.hubId && paper.isLinkedToHub}
					<span class="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded w-fit">
						{typeof paper.hubId === 'object' && paper.hubId !== null && 'type' in paper.hubId
							? paper.hubId.type.toUpperCase() + ' PAPER'
							: 'Hub'}
					</span>
					{#if typeof paper.hubId === 'object' && paper.hubId !== null && 'title' in paper.hubId}
						<span class="text-xs text-gray-600 ml-2">{paper.hubId.title}</span>
					{/if}
				{/if}
			</div>

			<h2 class="text-3xl font-semibold text-gray-800 mb-4">{@html paper.title}</h2>

			<div class="flex gap-3 items-center mb-4">
				{#if paper.mainAuthor?.profilePictureUrl}
					<Avatar
						src={paper.mainAuthor.profilePictureUrl}
						name={getDisplayName(paper.mainAuthor)}
						size="w-9"
					/>
				{:else}
					<div class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full">
						<span class="text-xs font-bold text-gray-600">{getInitials(getDisplayName(paper.mainAuthor))}</span>
					</div>
				{/if}
				<div class="flex items-center">
					{#if getProfileUrl(paper.mainAuthor)}
						<a class="text-primary-500 whitespace-nowrap" href={getProfileUrl(paper.mainAuthor) ?? '#'}>
							{getDisplayName(paper.mainAuthor)}
						</a>
					{:else}
						<span class="text-surface-700 whitespace-nowrap">{getDisplayName(paper.mainAuthor)}</span>
					{/if}
				</div>

				{#each paper.coAuthors ?? [] as ca}
					{@const coAuthorName = getDisplayName(ca)}
					{@const coAuthorProfileUrl = getProfileUrl(ca)}
					<div class="flex items-center gap-2">
						{#if ca.profilePictureUrl}
							<Avatar src={ca.profilePictureUrl} name={coAuthorName} size="w-9" />
						{:else}
							<div class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full">
								<span class="text-xs font-bold text-gray-600">{getInitials(coAuthorName)}</span>
							</div>
						{/if}
						<div class="flex items-center">
							{#if coAuthorProfileUrl}
								<a class="text-primary-500 whitespace-nowrap" href={coAuthorProfileUrl}>
									{coAuthorName}
								</a>
							{:else}
								<span class="text-surface-700 whitespace-nowrap">{coAuthorName}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<span class="text-xs">Published: {new Date(paper.createdAt).toDateString()}</span>

			{#if paper.peer_review}
				<div class="mt-2 p-3 bg-gray-50 rounded-lg">
					<h4 class="text-sm font-semibold text-gray-700 mb-1">Review Information</h4>
					<div class="text-xs text-gray-600">
						<p>Average Score: {paper.peer_review.averageScore}/5</p>
						<p>Total Reviews: {paper.peer_review.reviewCount}</p>
						<p>Review Status: {paper.peer_review.reviewStatus}</p>
					</div>
				</div>
			{/if}

			{#if paper.paperPictures && paper.paperPictures.length > 0}
				<img
					src={`/api/images/${paper.paperPictures[0]}`}
					alt="Paper illustration"
					class="w-full h-full object-cover rounded-sm mb-4 mt-4"
				/>
			{:else}
				<div class="bg-gray-300 w-full h-48 rounded-sm flex items-center justify-center text-gray-500 mb-4 mt-4">
					<span>No image available</span>
				</div>
			{/if}

			<h2 class="mt-4 text-surface-900 font-bold prose text-2xl max-w-none">Abstract</h2>
			<div class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg paper-content">
				{@html paper.abstract}
			</div>

			<div class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 paper-content">
				{@html paper.content}
			</div>

			{#if paper.supplementaryMaterials && paper.supplementaryMaterials.length > 0}
				<div class="mt-6">
					<SupplementaryMaterials materials={paper.supplementaryMaterials} />
				</div>
			{/if}

			{#if paper.keywords && paper.keywords.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each paper.keywords as keyword}
						<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">{keyword}</span>
					{/each}
				</div>
			{/if}

			{#if paper.pdfUrl}
				<div class="mt-4">
					<a
						href={`/api/pdfs/${paper.pdfUrl}`}
						target="_blank"
						class="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						View PDF
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-center py-10">
			<p class="text-gray-600">No published paper found.</p>
		</div>
	{/if}
</div>
