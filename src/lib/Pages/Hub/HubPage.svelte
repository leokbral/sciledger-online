<script lang="ts">
    import { onMount } from 'svelte';
    // import type { Hub } from '$lib/types';

    let hubs: any[] = []; // Replace 'any' with the actual type of your hub data
    let loading = true;
    let error: string | null = null;

    onMount(async () => {
        try {
            const response = await fetch('/hub');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            hubs = data.hubs;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load hubs';
            console.error('Error loading hubs:', e);
        } finally {
            loading = false;
        }
    });
</script>

<div class="p-8">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold">Research Hubs</h1>
        <a
            href="/hub/new"
            class="btn preset-filled-primary-500 text-white transition-colors duration-200"
            data-sveltekit-preload-data="hover"
        >
            Create New Hub
        </a>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {#if loading}
            <p class="text-gray-600">Loading hubs...</p>
        {:else if error}
            <p class="text-red-600">Error: {error}</p>
        {:else if hubs.length === 0}
            <p class="text-gray-600">No hubs found. Create your first hub!</p>
        {:else}
            {#each hubs as hub}
                <a 
                    href="/hub/view/{hub.id}" 
                    class="block relative w-full h-80 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                    data-sveltekit-preload-data="hover"
                >
                    <!-- Card image -->
                    {#if hub.cardUrl}
                        <img
                            src={`/api/images/${hub.cardUrl}`}
                            alt={`${hub.title} Card`}
                            class="absolute w-full h-full object-cover"
                        />
                    {:else}
                        <div class="absolute w-full h-full bg-gradient-to-br from-primary-500 to-primary-700"></div>
                    {/if}

                    <!-- Gradient overlay -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                    <!-- Content -->
                    <div class="absolute inset-0 p-6 flex flex-col justify-between text-white">
                        <!-- Title at the top -->
                        <div>
                            <h2 class="text-2xl font-bold leading-tight mb-4">{hub.title}</h2>
                            
                            <!-- Logo and Type in the same line -->
                            <div class="flex items-center gap-4">
                                {#if hub.logoUrl}
                                    <img
                                        src={`/api/images/${hub.logoUrl}`}
                                        alt={`${hub.title} Logo`}
                                        class="w-16 h-16 rounded-full border-2 border-white shadow-lg object-cover"
                                    />
                                {/if}
                                <span class="text-lg text-white/90">{hub.type}</span>
                            </div>
                        </div>

                        <!-- Description at the bottom -->
                        <p class="text-sm text-white/80 line-clamp-2">{hub.description}</p>
                    </div>
                </a>
            {/each}
        {/if}
    </div>
</div>
