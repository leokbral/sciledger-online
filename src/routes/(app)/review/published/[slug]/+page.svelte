<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	// Receber os dados do servidor
	export let data: PageData;

	// O paper já vem filtrado do servidor (publicado e revisado pelo usuário)
	$: reviewedPublishedPaper = data.paper;

	// Function to style reference links
	function styleReferenceLinks() {
		if (typeof window !== 'undefined') {
			// Find all elements that might contain reference links
			const contentElements = document.querySelectorAll('.paper-content');

			contentElements.forEach((element) => {
				// Look for text patterns like [1], [2], etc.
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

<div class="space-y-6 max-w-[900px] ml-6">
	{#if reviewedPublishedPaper}
		<div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
			<!-- Badge indicando que foi revisado pelo usuário -->
			<div class="flex flex-col gap-1 mb-2">
				<span class="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
					✓ REVIEWED BY YOU
				</span>
				{#if reviewedPublishedPaper.hubId && reviewedPublishedPaper.isLinkedToHub}
					<span class="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded w-fit">
						{typeof reviewedPublishedPaper.hubId === 'object' && reviewedPublishedPaper.hubId !== null && 'type' in reviewedPublishedPaper.hubId
							? reviewedPublishedPaper.hubId.type.toUpperCase() + ' PAPER'
							: 'Hub'}
					</span>
					<span class="text-xs text-gray-600 ml-2">
						<a
							href={`/hub/view/${typeof reviewedPublishedPaper.hubId === 'object' && reviewedPublishedPaper.hubId !== null && '_id' in reviewedPublishedPaper.hubId ? reviewedPublishedPaper.hubId._id : reviewedPublishedPaper.hubId}`}
							class="text-primary-500 hover:text-primary-700"
						>
							{typeof reviewedPublishedPaper.hubId === 'object' && reviewedPublishedPaper.hubId !== null && 'title' in reviewedPublishedPaper.hubId
								? reviewedPublishedPaper.hubId.title
								: 'Unknown Hub'}
						</a>
					</span>
				{/if}
			</div>

			<!-- Título do Paper -->
			<h2 class="text-3xl font-semibold text-gray-800 mb-4">{reviewedPublishedPaper.title}</h2>

			<!-- Autores -->
			<div class="flex gap-3 items-center mb-4">
				{#if reviewedPublishedPaper.mainAuthor?.profilePictureUrl}
					<Avatar
						src={reviewedPublishedPaper.mainAuthor.profilePictureUrl}
						name={`${reviewedPublishedPaper.mainAuthor.firstName} ${reviewedPublishedPaper.mainAuthor.lastName}`}
						size="w-9"
					/>
				{:else}
					<Avatar
						name="{reviewedPublishedPaper.mainAuthor.firstName} {reviewedPublishedPaper.mainAuthor.lastName}"
						size="w-9"
						style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
					/>
				{/if}
				<div class="flex items-center">
					<a
						class="text-primary-500 whitespace-nowrap"
						href="/profile/{reviewedPublishedPaper.mainAuthor?.username}"
					>
						{reviewedPublishedPaper.mainAuthor.firstName}
						{reviewedPublishedPaper.mainAuthor.lastName}
					</a>
				</div>

				<!-- Coautores -->
				{#each reviewedPublishedPaper.coAuthors as ca}
					<div class="flex items-center gap-2">
						{#if ca.profilePictureUrl}
							<Avatar
								src={ca.profilePictureUrl}
								name={`${ca.firstName} ${ca.lastName}`}
								size="w-9"
							/>
						{:else}
							<Avatar
								name="{ca.firstName} {ca.lastName}"
								size="w-9"
								style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
							/>
						{/if}
						<div class="flex items-center">
							<a class="text-primary-500 whitespace-nowrap" href="/profile/{ca.username}">
								{ca.firstName}
								{ca.lastName}
							</a>
						</div>
					</div>
				{/each}
			</div>

			<span class="text-xs">Published: {new Date(reviewedPublishedPaper.createdAt).toDateString()}</span>

			<!-- Informações da Revisão -->
			{#if reviewedPublishedPaper.peer_review}
				<div class="mt-2 p-3 bg-gray-50 rounded-lg">
					<h4 class="text-sm font-semibold text-gray-700 mb-1">Review Information</h4>
					<div class="text-xs text-gray-600">
						<p>Average Score: {reviewedPublishedPaper.peer_review.averageScore}/5</p>
						<p>Total Reviews: {reviewedPublishedPaper.peer_review.reviewCount}</p>
						<p>Review Status: {reviewedPublishedPaper.peer_review.reviewStatus}</p>
					</div>
				</div>
			{/if}

			<!-- Imagem Principal -->
			{#if reviewedPublishedPaper.paperPictures && reviewedPublishedPaper.paperPictures.length > 0}
				<img
					src={`/api/images/${reviewedPublishedPaper.paperPictures[0]}`}
					alt="Imagem do artigo"
					class="w-full h-full object-cover rounded-sm mb-4 mt-4"
				/>
			{:else}
				<!-- Placeholder caso não haja imagem -->
				<div
					class="bg-gray-300 w-full h-48 rounded-sm flex items-center justify-center text-gray-500 mb-4 mt-4"
				>
					<span>No image available</span>
				</div>
			{/if}

			<!-- Corpo do Texto (Abstract) -->
			<h2 class="mt-4 text-surface-900 font-bold prose text-2xl max-w-none">Abstract</h2>

			<div class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg paper-content">
				{@html reviewedPublishedPaper.abstract}
			</div>

			<!-- Corpo do Texto (Content) -->
			<div
				class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 paper-content"
			>
				{@html reviewedPublishedPaper.content}
			</div>

			<!-- Tags/Keywords -->
			{#if reviewedPublishedPaper.keywords && reviewedPublishedPaper.keywords.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each reviewedPublishedPaper.keywords as keyword}
						<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
							{keyword}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Link para visualizar PDF -->
			{#if reviewedPublishedPaper.pdfUrl}
				<div class="mt-4">
					<a
						href={`/api/pdfs/${reviewedPublishedPaper.pdfUrl}`}
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
	{/if}
</div>

<!-- Se não houver paper -->
{#if !reviewedPublishedPaper}
	<div class="text-center py-10">
		<p class="text-gray-600">No published paper found that you have reviewed.</p>
	</div>
{/if}
