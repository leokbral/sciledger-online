<script lang="ts">
    import Icon from '@iconify/svelte';
    import { Avatar, Modal } from '@skeletonlabs/skeleton-svelte';
    import { getInitials } from '$lib/utils/GetInitials';
    import { toaster } from '$lib/toaster-svelte';
    import type { Paper } from '$lib/types/Paper';
	import type { Hub } from '$lib/types/Hub';
	import type { User } from '$lib/types/User';

    interface Props {
        papers: Paper[];
        hub: Hub;
        isCreator: boolean;
        userId: string;
        shouldHighlight: (paper: any) => boolean;
    }

    let { papers, hub, isCreator, userId, shouldHighlight }: Props = $props();
    
    let hubId = $derived(hub._id);
    
    // Verificar se o usuário é revisor designado deste paper
    function isDesignatedReviewer(paper: Paper): boolean {
        return paper.isAcceptedForReview === true;
    }
    
    let selectedPaper: Paper | null = $state(null);
    let selectedReviewers: string[] = $state([]);
    let openInviteModal = $state(false);
    let loading = $state(false);
    
    // Filtrar revisores disponíveis que ainda não foram convidados
    function getAvailableReviewers(paper: Paper) {
        if (!hub.reviewers || !Array.isArray(hub.reviewers)) return [];
        
        const assignedIds = paper.peer_review?.assignedReviewers?.map((r: any) => 
            typeof r === 'object' ? (r._id || r.id) : r
        ) || [];
        
        return hub.reviewers.filter((reviewer: any) => {
            const reviewerId = typeof reviewer === 'object' ? (reviewer._id || reviewer.id) : reviewer;
            return !assignedIds.includes(reviewerId);
        });
    }
    
    function openInviteDialog(paper: Paper) {
        selectedPaper = paper;
        selectedReviewers = [];
        openInviteModal = true;
    }
    
    function toggleReviewer(reviewerId: string) {
        if (selectedReviewers.includes(reviewerId)) {
            selectedReviewers = selectedReviewers.filter(id => id !== reviewerId);
        } else {
            selectedReviewers = [...selectedReviewers, reviewerId];
        }
    }
    
    async function sendInvitations() {
        if (!selectedPaper || selectedReviewers.length === 0) return;
        
        loading = true;
        try {
            const response = await fetch('/api/paper-reviewer-invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: selectedPaper.id,
                    hubId: hub._id,
                    reviewerIds: selectedReviewers
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                toaster.success(`Invited ${selectedReviewers.length} reviewer(s) successfully!`);
                openInviteModal = false;
                selectedReviewers = [];
            } else {
                toaster.error(data.error || 'Failed to send invitations');
            }
        } catch (error) {
            console.error(error);
            toaster.error('An error occurred');
        } finally {
            loading = false;
        }
    }
</script>

<section>
    <div class="mt-6 bg-white shadow-md rounded-xl p-6">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Submitted Articles</h2>
            <a
                data-sveltekit-reload
                href="/publish/new?hubId={hubId}"
                class="btn preset-filled-primary-500 text-white"
                data-sveltekit-preload-data="hover"
            >
                Submit a New Article
            </a>
        </div>

        {#if papers && papers.length > 0}
            <div class="space-y-4">
                {#each papers as paper}
                    <div
                        class="border rounded-lg p-4 transition-colors"
                        class:bg-yellow-50={shouldHighlight(paper) && !isDesignatedReviewer(paper)}
                        class:border-yellow-300={shouldHighlight(paper) && !isDesignatedReviewer(paper)}
                        class:bg-blue-50={isDesignatedReviewer(paper)}
                        class:border-blue-400={isDesignatedReviewer(paper)}
                    >
                        {#if isDesignatedReviewer(paper)}
                            <div
                                class="mb-3 p-3 bg-blue-100 border border-blue-400 rounded text-blue-900 text-sm font-medium flex items-center gap-2"
                            >
                                <Icon icon="mdi:account-check" width="20" height="20" class="text-blue-600" />
                                <span>
                                    You are the <strong>designated reviewer</strong> for this article. You can view and review it.
                                </span>
                            </div>
                        {:else if shouldHighlight(paper)}
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
                                        {@html paper.title}
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
                                {#if isCreator && paper.status !== 'published' && getAvailableReviewers(paper).length > 0}
                                    <button
                                        class="btn btn-sm preset-filled-secondary-500 flex items-center gap-1"
                                        onclick={() => openInviteDialog(paper)}
                                    >
                                        <Icon icon="mdi:account-plus" width="20" height="20" />
                                        Invite Reviewers
                                    </button>
                                {/if}
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

<!-- Modal para convidar revisores -->
<Modal bind:open={openInviteModal}>
    {#snippet trigger()}<span></span>{/snippet}
    
    {#snippet content()}
        <div class="p-6">
            <h3 class="text-2xl font-bold mb-4">Invite Hub Reviewers</h3>
            
            {#if selectedPaper}
                <p class="text-surface-600 mb-2">Paper: <strong>{selectedPaper.title}</strong></p>
                
                {#if getAvailableReviewers(selectedPaper).length === 0}
                    <p class="text-surface-600 mb-4">All hub reviewers have already been invited.</p>
                {:else}
                    <p class="text-surface-600 mb-4">Select reviewers to invite:</p>
                    
                    <div class="space-y-2 mb-6 max-h-96 overflow-y-auto">
                        {#each getAvailableReviewers(selectedPaper) as reviewer}
                            {@const rev = typeof reviewer === 'object' ? reviewer : null}
                            {#if rev}
                                <label class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedReviewers.includes(rev._id || rev.id)}
                                        onchange={() => toggleReviewer(rev._id || rev.id)}
                                        class="checkbox"
                                    />
                                    <div class="flex items-center gap-3">
                                        {#if rev.profilePictureUrl}
                                            <img
                                                src={rev.profilePictureUrl}
                                                alt={rev.firstName}
                                                class="w-10 h-10 rounded-full"
                                            />
                                        {:else}
                                            <div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                                {rev.firstName?.[0]}{rev.lastName?.[0]}
                                            </div>
                                        {/if}
                                        <div>
                                            <p class="font-semibold">
                                                {rev.firstName} {rev.lastName}
                                            </p>
                                            <p class="text-sm text-surface-600">{rev.email}</p>
                                        </div>
                                    </div>
                                </label>
                            {/if}
                        {/each}
                    </div>
                {/if}
                
                <div class="flex justify-end gap-3">
                    <button 
                        class="btn preset-outlined" 
                        onclick={() => openInviteModal = false}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn preset-filled-primary-500"
                        onclick={sendInvitations}
                        disabled={loading || selectedReviewers.length === 0}
                    >
                        {#if loading}
                            <Icon icon="eos-icons:loading" class="size-5" />
                            Sending...
                        {:else}
                            <Icon icon="mdi:send" class="size-5" />
                            Send Invitations ({selectedReviewers.length})
                        {/if}
                    </button>
                </div>
            {/if}
        </div>
    {/snippet}
</Modal>