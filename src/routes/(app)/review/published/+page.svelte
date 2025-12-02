<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	// Receive data from server
	export let data: PageData;

	// Papers published that were reviewed by the user
	$: reviewedPublishedPapers = data.papers || [];

	// Function to style reference links
	function styleReferenceLinks() {
		if (typeof window !== 'undefined') {
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
	}

	onMount(() => {
		styleReferenceLinks();
	});
</script>

<svelte:head>
	<title>Published Papers You Reviewed</title>
</svelte:head>

<main class="container mx-auto px-4 py-8">
	<!-- Title of the Page -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-800 mb-2">Published Papers You Reviewed</h1>
		<p class="text-gray-600">Papers that you have reviewed and are now published</p>
	</div>

	<!-- List of Papers -->
	<div class="space-y-6 max-w-[900px]">
		{#each reviewedPublishedPapers as paper}
			<div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
				<!-- Badge indicating it was reviewed by the user -->
				<div class="flex flex-col gap-1 mb-2">
					<span class="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
						✓ REVIEWED BY YOU
					</span>
					{#if paper.hubId && paper.isLinkedToHub}
						<span class="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded w-fit">
							{typeof paper.hubId === 'object' && paper.hubId !== null && 'type' in paper.hubId
								? paper.hubId.type.toUpperCase() + ' PAPER'
								: 'Hub'}
						</span>
					{/if}
				</div>

				<!-- Title of the Paper -->
				<h2 class="text-2xl font-semibold text-gray-800 mb-3">
					<a 
						href={`/review/published/${paper.id}`}
						class="hover:text-primary-600 transition-colors"
					>
						{@html paper.title}
					</a>
				</h2>

				<!-- Authors -->
				<div class="flex gap-3 items-center mb-3">
					{#if paper.mainAuthor?.profilePictureUrl}
						<Avatar
							src={paper.mainAuthor.profilePictureUrl}
							name={`${paper.mainAuthor.firstName} ${paper.mainAuthor.lastName}`}
							size="w-8"
						/>
					{:else}
						<Avatar
							name="{paper.mainAuthor.firstName} {paper.mainAuthor.lastName}"
							size="w-8"
							style="width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
						/>
					{/if}
					<div class="flex items-center">
						<a
							class="text-primary-500 text-sm hover:text-primary-700"
							href="/profile/{paper.mainAuthor?.username}"
						>
							{paper.mainAuthor.firstName}
							{paper.mainAuthor.lastName}
						</a>
					</div>

					<!-- Co-Authors -->
					{#each paper.coAuthors.slice(0, 2) as ca}
						<div class="flex items-center gap-1">
							{#if ca.profilePictureUrl}
								<Avatar
									src={ca.profilePictureUrl}
									name={`${ca.firstName} ${ca.lastName}`}
									size="w-8"
								/>
							{:else}
								<Avatar
									name="{ca.firstName} {ca.lastName}"
									size="w-8"
									style="width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
								/>
							{/if}
							<a class="text-primary-500 text-sm hover:text-primary-700" href="/profile/{ca.username}">
								{ca.firstName} {ca.lastName}
							</a>
						</div>
					{/each}
					{#if paper.coAuthors.length > 2}
						<span class="text-sm text-gray-500">+{paper.coAuthors.length - 2} more</span>
					{/if}
				</div>

				<span class="text-xs text-gray-500">Published: {new Date(paper.createdAt).toDateString()}</span>

				<!-- Information about the Review -->
				{#if paper.peer_review}
					<div class="mt-3 p-3 bg-gray-50 rounded-lg">
						<h4 class="text-sm font-semibold text-gray-700 mb-1">Review Information</h4>
						<div class="text-xs text-gray-600 flex gap-4">
							<span>Score: {paper.peer_review.averageScore}/5</span>
							<span>Reviews: {paper.peer_review.reviewCount}</span>
							<span>Status: {paper.peer_review.reviewStatus}</span>
						</div>
					</div>
				{/if}

				<!-- Abstract (truncated) -->
				<div class="mt-4 text-gray-700 text-sm line-clamp-3">
					{@html paper.abstract}
				</div>

				<!-- Tags/Keywords (limited) -->
				{#if paper.keywords && paper.keywords.length > 0}
					<div class="mt-3 flex flex-wrap gap-1">
						{#each paper.keywords.slice(0, 3) as keyword}
							<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
								{keyword}
							</span>
						{/each}
						{#if paper.keywords.length > 3}
							<span class="text-xs text-gray-500 px-2 py-1">+{paper.keywords.length - 3} more</span>
						{/if}
					</div>
				{/if}

				<!-- Link to view full paper -->
				<div class="mt-4">
					<a
						href={`/review/published/${paper.id}`}
						class="inline-flex items-center text-primary-600 hover:text-primary-800 text-sm font-medium"
					>
						Read full paper
						<svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</a>
				</div>
			</div>
		{/each}
	</div>

	<!-- If there are no papers -->
	{#if reviewedPublishedPapers.length === 0}
		<div class="text-center py-16">
			<div class="max-w-md mx-auto">
				<svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No published papers found</h3>
				<p class="text-gray-600">You haven't reviewed any papers that are now published.</p>
			</div>
		</div>
	{/if}

	<!-- Loading skeleton -->
	{#if !data}
		<div class="space-y-6">
			{#each [1, 2, 3] as _}
				<div class="p-6 bg-white rounded-lg shadow-lg animate-pulse">
					<div class="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
					<div class="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
					<div class="h-4 bg-gray-300 rounded w-5/6 mb-4"></div>
					<div class="h-3 bg-gray-300 rounded w-1/3"></div>
				</div>
			{/each}
		</div>
	{/if}
</main>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>