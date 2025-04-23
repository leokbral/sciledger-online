<script lang="ts">
    import { Avatar } from '@skeletonlabs/skeleton-svelte';
    import type { PageData } from './$types';
    import { onMount } from 'svelte';

    // Receber os dados do servidor
    export let data: PageData;

    // Filtrar apenas papers com status "published"
    $: publishedPapers = data.paper && data.paper.status === 'published' ? [data.paper] : [];
    
    // Function to style reference links
    function styleReferenceLinks() {
        if (typeof window !== 'undefined') {
            // Find all elements that might contain reference links
            const contentElements = document.querySelectorAll('.paper-content');
            
            contentElements.forEach(element => {
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

<!-- <main class="bg-gray-100 min-h-screen p-6"> -->
    <!-- Título da Página -->
    <!-- <h1 class="text-4xl font-bold text-center text-gray-800 mb-8">Published Paper</h1> -->

    <!-- Lista de Papers -->
    <div class="space-y-6 max-w-[900px] ml-6">

        {#each publishedPapers as paper}
            <div class="p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <!-- Título do Paper -->
                <h2 class="text-3xl font-semibold text-gray-800 mb-4 ">{paper.title}</h2>

                <!-- Autores -->
                <div class="flex gap-3 items-center mb-4">
                    {#if paper.mainAuthor?.profilePictureUrl}
                        <Avatar
                            src={paper.mainAuthor.profilePictureUrl}
                            name={paper.mainAuthor.username}
                            size="w-9"
                        />
                    {:else}
                        <Avatar
                            name="{paper.mainAuthor.firstName} {paper.mainAuthor.lastName}"
                            size="w-9"
                            style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
                        />
                    {/if}
                    <div class="flex flex-col justify-center">
                        <a class="text-primary-500" href="/profile/{paper.mainAuthor?.username}">
                            {paper.mainAuthor.username || 'ERROR-404'}
                        </a>
                    </div>

                    <!-- Coautores -->
                    {#each paper.coAuthors as ca}
                        <div class="flex items-center gap-2">
                            {#if ca.profilePictureUrl}
                                <Avatar src={ca.profilePictureUrl} name={ca.username} size="w-9" />
                            {:else}
                                <Avatar
                                    name="{ca.firstName} {ca.lastName}"
                                    size="w-9"
                                    style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
                                />
                            {/if}
                            <div class="flex flex-col justify-center">
                                <a class="text-primary-500" href="/profile/{ca.username}">
                                    {ca.username}
                                </a>
                            </div>
                        </div>
                    {/each}
                </div>

                <span class="text-xs">Published: {new Date(paper.createdAt).toDateString()}</span>
                
                <!-- Imagem Principal -->
                {#if paper.paperPictures && paper.paperPictures.length > 0}
                    <img
                        src={paper.paperPictures[0]}
                        alt="Imagem do artigo"
                        class="w-full h-48 object-cover rounded-sm mb-4"
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
