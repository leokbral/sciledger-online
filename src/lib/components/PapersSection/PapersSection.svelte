<script lang="ts">
    import Icon from '@iconify/svelte';
    import { Avatar } from '@skeletonlabs/skeleton-svelte';
    import { getInitials } from '$lib/utils/GetInitials';
    import type { Paper } from '$lib/types/Paper';
	import type { Hub } from '$lib/types/Hub';

    export let papers: Paper[] = [];
    export let hub: Hub;
    export let isCreator: boolean;
    export let userId: string;
    export let shouldHighlight: (paper: any) => boolean;
</script>

<section>
    <div class="mt-6 bg-white shadow-md rounded-xl p-6">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Submitted Articles</h2>

        {#if papers && papers.length > 0}
            <div class="space-y-4">
                {#each papers as paper}
                    <div
                        class="border rounded-lg p-4 transition-colors"
                        class:bg-yellow-50={shouldHighlight(paper)}
                        class:border-yellow-300={shouldHighlight(paper)}
                    >
                        {#if shouldHighlight(paper)}
                            <div
                                class="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm font-medium"
                            >
                                {#if isCreator || hub.reviewers?.includes(userId)}
                                    This article has <strong>not been published</strong> yet and is visible to you as a hub {isCreator ? 'owner' : 'reviewer'}.
                                {:else}
                                    This article has <strong>not been published</strong> yet and is visible only to you and the authors involved.
                                {/if}
                            </div>
                        {/if}

                        <div class="flex justify-between items-start">
                            <div>
                                <h2 class="text-s font-semibold text-gray-800">
                                    {hub.type ? hub.type.toUpperCase() : ''} PAPER
                                </h2>
                                <a
                                    href={`/hub/view/${hub._id}`}
                                    class="text-xs text-blue-600 hover:text-blue-600 hover:underline"
                                >
                                    {hub.title}
                                </a>
                                <h3 class="text-lg font-medium text-gray-900 mt-4">
                                    <a
                                        href={`/publish/published/${paper._id}`}
                                        class="hover:text-primary-600 transition-colors"
                                    >
                                        {paper.title}
                                    </a>
                                </h3>
                                <div class="text-sm text-gray-600 mt-1 flex items-center">
                                    <span class="mr-2">
                                        {new Date(paper.createdAt).toLocaleDateString()} |
                                    </span>
                                    <div class="flex items-center gap-2">
                                        <!-- Main Author -->
                                        {#if paper.mainAuthor}
                                            <div class="flex items-center gap-1">
                                                {#if paper.mainAuthor.profilePictureUrl}
                                                    <Avatar
                                                        src={paper.mainAuthor.profilePictureUrl}
                                                        name={paper.mainAuthor.firstName}
                                                        size="w-6"
                                                    />
                                                {:else}
                                                    <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                                        <span class="text-xs font-bold text-gray-600">
                                                            {getInitials(paper.mainAuthor.firstName, paper.mainAuthor.lastName)}
                                                        </span>
                                                    </div>
                                                {/if}
                                                <a
                                                    href={`/profile/${paper.mainAuthor.username}`}
                                                    class="text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {paper.mainAuthor.firstName + ' ' + paper.mainAuthor.lastName}
                                                </a>
                                            </div>
                                        {/if}

                                        <!-- Co-authors -->
                                        {#if paper.coAuthors && paper.coAuthors.length > 0}
                                            <div class="flex items-center gap-1">
                                                {#each paper.coAuthors as coAuthor, i}
                                                    <div class="flex items-center gap-1">
                                                        {#if coAuthor.profilePictureUrl}
                                                            <Avatar
                                                                src={coAuthor.profilePictureUrl}
                                                                name={coAuthor.firstName}
                                                                size="w-6"
                                                            />
                                                        {:else}
                                                            <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                                                <span class="text-xs font-bold text-gray-600">
                                                                    {getInitials(coAuthor.firstName, coAuthor.lastName)}
                                                                </span>
                                                            </div>
                                                        {/if}
                                                        <a
                                                            href={`/profile/${coAuthor.username}`}
                                                            class="text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            {coAuthor.firstName + ' ' + coAuthor.lastName}
                                                        </a>
                                                        {#if i < paper.coAuthors.length - 1}
                                                            <span class="mx-1">,</span>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            </div>
                                        {/if}
                                    </div>
                                </div>

                                {#if paper.abstract}
                                    <p class="text-gray-700 mt-6 line-clamp-2">{@html paper.abstract}</p>
                                {/if}
                            </div>
                        </div>

                        <!-- Bottom section with keywords and actions -->
                        <div class="flex justify-between items-end mt-4">
                            <div>
                                {#if paper.keywords?.length}
                                    <div class="flex gap-2 mt-2 flex-wrap">
                                        {#each paper.keywords as keyword}
                                            <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {keyword}
                                            </span>
                                        {/each}
                                    </div>
                                {/if}
                            </div>

                            <!-- Action buttons -->
                            <div class="flex items-center gap-2">
                                <!-- {#if paper.pdfId}
                                    <a
                                        href={`/api/papers/${paper._id}/download`}
                                        class="btn btn-sm variant-filled"
                                        target="_blank"
                                    >
                                        <Icon icon="mdi:file-pdf-box" width="20" height="20" />
                                        PDF
                                    </a>
                                {/if} -->
                                <a
                                    href={`/publish/published/${paper._id}`}
                                    class="btn btn-sm bg-primary-100-700 text-primary-700-100 hover:bg-primary-200-600 hover:text-primary-800-50 transition-colors duration-200 flex items-center gap-1"
                                >
                                    Read More
                                    <Icon icon="mdi:arrow-right" width="20" height="20" />
                                </a>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-gray-600 text-center py-8">No articles submitted yet.</p>
        {/if}
    </div>
</section>