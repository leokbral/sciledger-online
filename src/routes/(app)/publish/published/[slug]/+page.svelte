<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import SupplementaryMaterials from '$lib/components/SupplementaryMaterials.svelte';
	import SupplementaryFiles from '$lib/components/SupplementaryFiles.svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	// Receber os dados do servidor
	export let data: PageData;

	// Filtrar apenas papers com status "published"
	$: publishedPapers = data.paper && (data.paper as any).status === 'published' ? [data.paper as any] : [];

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

	function getAuthorAcademicInfo(paperData: any, author: any): { department: string; university: string } {
		if (!author) return { department: '', university: '' };

		const authorId = String(author?.id || author?._id || '').trim();
		const authorUsername = String(author?.username || '').trim();

		if (Array.isArray(paperData?.authorAffiliations)) {
			const matchedAffiliation = paperData.authorAffiliations.find((item: any) => {
				const affiliationUserId = String(item?.userId || '').trim();
				const affiliationUsername = String(item?.username || '').trim();

				if (authorId && affiliationUserId && authorId === affiliationUserId) return true;
				if (authorUsername && affiliationUsername && authorUsername === affiliationUsername) return true;
				return false;
			});

			const customDepartment = String(matchedAffiliation?.department || '').trim();
			const customUniversity = String(matchedAffiliation?.affiliation || '').trim();
			if (customDepartment || customUniversity) {
				return { department: customDepartment, university: customUniversity };
			}
		}

		return {
			department: String(author?.position || '').trim(),
			university: String(author?.institution || '').trim()
		};
	}

	function hasAcademicInfo(paperData: any, author: any): boolean {
		const info = getAuthorAcademicInfo(paperData, author);
		return Boolean(info.department || info.university);
	}

	onMount(() => {
		styleReferenceLinks();
	});
</script>

<!-- <main class="bg-gray-100 min-h-screen p-6"> -->
<!-- Título da Página -->
<!-- <h1 class="text-4xl font-bold text-center text-gray-800 mb-8">Published Paper</h1> -->

<!-- Lista de Papers -->
<div class="space-y-6 max-w-[900px] ml-6">
	{#each publishedPapers as paper}
		<div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
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
			<h2 class="text-3xl font-semibold text-gray-800 mb-2">{@html paper.title}</h2>
			{#if paper.doi}
				<div class="text-sm text-primary-700 font-medium mb-3">
					<span class="uppercase text-xs tracking-wide text-primary-500 mr-2">DOI</span>
					<a class="hover:underline break-words" href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">{paper.doi}</a>
				</div>
			{/if}

			<!-- Authors -->
			<div class="mb-4">
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Authors</p>
				<div class="flex flex-wrap gap-2">
					<div class="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
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
						<div class="leading-tight">
							<a class="text-sm font-medium text-primary-600 hover:underline" href="/profile/{paper.mainAuthor?.username}">
								{paper.mainAuthor.firstName} {paper.mainAuthor.lastName}
							</a>
							{#if hasAcademicInfo(paper, paper.mainAuthor)}
								<details class="mt-1">
									<summary class="text-[11px] text-primary-700 hover:text-primary-800 cursor-pointer select-none">Details</summary>
									<div class="mt-1 text-xs text-gray-600 space-y-0.5">
										{#if getAuthorAcademicInfo(paper, paper.mainAuthor).department}
											<p><span class="font-medium">Department:</span> {getAuthorAcademicInfo(paper, paper.mainAuthor).department}</p>
										{/if}
										{#if getAuthorAcademicInfo(paper, paper.mainAuthor).university}
											<p><span class="font-medium">University:</span> {getAuthorAcademicInfo(paper, paper.mainAuthor).university}</p>
										{/if}
									</div>
								</details>
							{/if}
						</div>
					</div>

					{#each paper.coAuthors as ca}
						{@const coAuthorInfo = getAuthorAcademicInfo(paper, ca)}
						<div class="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2">
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
							<div class="leading-tight">
								<a class="text-sm font-medium text-primary-600 hover:underline" href="/profile/{ca.username}">
									{ca.firstName} {ca.lastName}
								</a>
								{#if coAuthorInfo.department || coAuthorInfo.university}
									<details class="mt-1">
										<summary class="text-[11px] text-primary-700 hover:text-primary-800 cursor-pointer select-none">Details</summary>
										<div class="mt-1 text-xs text-gray-600 space-y-0.5">
											{#if coAuthorInfo.department}
												<p><span class="font-medium">Department:</span> {coAuthorInfo.department}</p>
											{/if}
											{#if coAuthorInfo.university}
												<p><span class="font-medium">University:</span> {coAuthorInfo.university}</p>
											{/if}
										</div>
									</details>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<span class="text-xs">Published: {new Date(paper.createdAt).toDateString()}</span>

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

			<!-- <p class="mt-4 text-gray-700">{paper.abstract}</p> -->

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
	{/each}
</div>

<!-- Se não houver papers publicados -->
{#if publishedPapers.length === 0}
	<div class="text-center py-10">
		<p class="text-gray-600">No published papers found.</p>
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
<!-- </main> -->
