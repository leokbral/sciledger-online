<script lang="ts">
    import Icon from '@iconify/svelte';
    import { Avatar, Modal } from '@skeletonlabs/skeleton-svelte';
    import { getInitials } from '$lib/utils/GetInitials';
    import { toaster } from '$lib/toaster-svelte';
    import type { Paper } from '$lib/types/Paper';
	import type { Hub } from '$lib/types/Hub';
	import type { User } from '$lib/types/User';
	import ManageReviewerDeadline from '$lib/components/ReviewerManagement/ManageReviewerDeadline.svelte';

    interface Props {
        papers: Paper[];
        hub: Hub;
        isCreator: boolean;
        userId: string;
        shouldHighlight: (paper: any) => boolean;
        reviewAssignments?: any[];
    }

    let { papers, hub, isCreator, userId, shouldHighlight, reviewAssignments }: Props = $props();
    
    let hubId = $derived(hub._id);

    function getPaperSlug(paper: any): string {
        return (paper?.id || paper?._id || '') as string;
    }

    function getReadMoreHref(paper: any): string {
        const slug = getPaperSlug(paper);
        if (!slug) return '#';

        // Hub admin: publication approval requested after round 2
        if (isCreator && paper?.status === 'under negotiation' && paper?.reviewRound === 2) {
            return `/publish/publication-approval/${slug}`;
        }

        // Designated reviewer: show review form instead of author view
        if (isDesignatedReviewer(paper)) {
            if (paper?.status === 'in review') return `/review/inreview/${slug}`;
            if (paper?.status === 'needing corrections') return `/review/correction/${slug}`;
        }

        // Default routing by status (for authors/creators)
        if (paper?.status === 'under negotiation') {
            // Se for creator (hub owner), mostra na rota view
            if (isCreator) return `/publish/view/${slug}`;
            return `/publish/negotiation/${slug}`;
        }
        if (paper?.status === 'in review') return `/publish/inreview/${slug}`;
        if (paper?.status === 'needing corrections' || paper?.status === 'under correction') {
            return `/publish/corrections/${slug}`;
        }
        if (paper?.status === 'rejected' || paper?.rejectedByHub) {
            // Papers rejeitados vão para view se for creator
            if (isCreator) return `/publish/view/${slug}`;
        }
        return `/publish/published/${slug}`;
    }
    
    // Verificar se o usuário é revisor designado deste paper
    function isDesignatedReviewer(paper: Paper): boolean {
        return paper.isAcceptedForReview === true;
    }
    
    let selectedPaper: Paper | null = $state(null);
    let selectedReviewers: string[] = $state([]);
    let openInviteModal = $state(false);
    let openManageReviewersModal = $state(false);
    let openManageDeadlinesModal = $state(false);
    let openRejectModal = $state(false);
    let rejectionReason = $state('');
    let loading = $state(false);
    let searchTerm = $state('');
    
    // Filtrar revisores disponíveis que ainda não foram convidados
    // Excluir também autores, co-autores e submitter
    function getAvailableReviewers(paper: Paper) {
        if (!hub.reviewers || !Array.isArray(hub.reviewers)) return [];
        
        const assignedIds = paper.peer_review?.assignedReviewers?.map((r: any) => 
            typeof r === 'object' ? (r._id || r.id) : r
        ) || [];
        
        // Coletar IDs de autores, co-autores e submitter
        const authorIds = new Set<string>();
        
        // Adicionar autor principal
        if (paper.mainAuthor) {
            const mainId = typeof paper.mainAuthor === 'object' 
                ? (paper.mainAuthor._id || paper.mainAuthor.id)
                : paper.mainAuthor;
            authorIds.add(String(mainId));
        }
        
        // Adicionar co-autores
        if (paper.coAuthors && Array.isArray(paper.coAuthors)) {
            paper.coAuthors.forEach((author: any) => {
                const authorId = typeof author === 'object'
                    ? (author._id || author.id)
                    : author;
                authorIds.add(String(authorId));
            });
        }
        
        // Adicionar submitter
        if (paper.submittedBy) {
            const submitterId = typeof paper.submittedBy === 'object'
                ? (paper.submittedBy._id || paper.submittedBy.id)
                : paper.submittedBy;
            authorIds.add(String(submitterId));
        }
        
        return hub.reviewers.filter((reviewer: any) => {
            const reviewerId = typeof reviewer === 'object' ? (reviewer._id || reviewer.id) : reviewer;
            // Excluir se já foi atribuído
            if (assignedIds.includes(reviewerId)) {
                return false;
            }
            // Excluir se é autor/coautor/submitter
            if (authorIds.has(String(reviewerId))) {
                return false;
            }
            return true;
        });
    }
    
    // Filtrar revisores com base na busca
    function getFilteredReviewers(paper: Paper) {
        const available = getAvailableReviewers(paper);
        if (!searchTerm) return available;
        
        return available.filter((reviewer: any) => {
            const rev = typeof reviewer === 'object' ? reviewer : null;
            if (!rev) return false;
            const fullName = `${rev.firstName} ${rev.lastName}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase());
        });
    }
    
    function openInviteDialog(paper: Paper) {
        selectedPaper = paper;
        selectedReviewers = [];
        searchTerm = '';
        openInviteModal = true;
    }
    
    function openManageReviewersDialog(paper: Paper) {
        console.log('📋 Opening Manage Reviewers for paper:', paper.id);
        console.log('👥 Paper reviewers:', paper.reviewers);
        console.log('🏢 Hub reviewers:', hub.reviewers);
        selectedPaper = paper;
        openManageReviewersModal = true;
    }
    
    function openManageDeadlinesDialog(paper: Paper) {
        selectedPaper = paper;
        openManageDeadlinesModal = true;
    }
    
    function openRejectDialog(paper: Paper) {
        selectedPaper = paper;
        rejectionReason = '';
        openRejectModal = true;
    }
    
    async function rejectPaper() {
        if (!selectedPaper || !rejectionReason.trim()) {
            toaster.error('Please provide a rejection reason');
            return;
        }
        
        loading = true;
        try {
            const response = await fetch(`/api/papers/${selectedPaper._id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: rejectionReason.trim() })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                toaster.success('Paper rejected successfully. Author has been notified.');
                openRejectModal = false;
                rejectionReason = '';
                // Refresh the page to show updated status
                window.location.reload();
            } else {
                toaster.error(data.error || 'Failed to reject paper');
            }
        } catch (error) {
            console.error(error);
            toaster.error('An error occurred while rejecting the paper');
        } finally {
            loading = false;
        }
    }
    
    async function removeReviewer(reviewerId: string) {
        if (!selectedPaper) return;
        
        const confirmRemove = confirm('Are you sure you want to remove this reviewer from the paper?');
        if (!confirmRemove) return;
        
        loading = true;
        try {
            const response = await fetch(`/api/papers/${selectedPaper.id}/remove-reviewer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    reviewerId: reviewerId
                })
            });
            
            if (response.ok) {
                toaster.success({ title: 'Success', description: 'Reviewer removed successfully' });
                // Recarregar a página para atualizar a lista
                window.location.reload();
            } else {
                throw new Error('Failed to remove reviewer');
            }
        } catch (error) {
            console.error(error);
            toaster.error({ title: 'Error', description: 'Failed to remove reviewer' });
        } finally {
            loading = false;
        }
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
                        class:bg-white={paper.status === 'published'}
                        class:border-gray-300={paper.status === 'published'}
                        class:bg-red-50={paper.status === 'rejected'}
                        class:border-red-300={paper.status === 'rejected'}
                        class:bg-yellow-50={paper.status !== 'published' && paper.status !== 'rejected' && shouldHighlight(paper) && !isDesignatedReviewer(paper)}
                        class:border-yellow-300={paper.status !== 'published' && paper.status !== 'rejected' && shouldHighlight(paper) && !isDesignatedReviewer(paper)}
                        class:bg-blue-50={paper.status !== 'published' && paper.status !== 'rejected' && isDesignatedReviewer(paper)}
                        class:border-blue-400={paper.status !== 'published' && paper.status !== 'rejected' && isDesignatedReviewer(paper)}
                    >
                        {#if paper.status === 'rejected'}
                            <div
                                class="mb-3 p-3 bg-red-100 border border-red-400 rounded text-red-900 text-sm font-medium flex items-start gap-2"
                            >
                                <Icon icon="mdi:close-circle" width="24" height="24" class="text-red-600 flex-shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <span class="font-bold block mb-1">This paper has been rejected</span>
                                    {#if paper.rejectionReason}
                                        <span class="text-xs block">Reason: {paper.rejectionReason}</span>
                                    {/if}
                                    {#if paper.rejectedAt}
                                        <span class="text-xs block mt-1 opacity-75">
                                            Rejected on {new Date(paper.rejectedAt).toLocaleDateString()}
                                        </span>
                                    {/if}
                                </div>
                            </div>
                        {:else if paper.status !== 'published'}
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
                                        href={paper.status === 'published' 
                                            ? `/publish/published/${paper._id}` 
                                            : (paper.status === 'rejected' || paper.rejectedByHub || paper.status === 'under negotiation') && isCreator
                                                ? `/publish/view/${paper._id}`
                                                : `/publish/published/${paper._id}`}
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
                                {#if isCreator && paper.status !== 'published'}
                                    {#if paper.status === 'under negotiation' && !paper.rejectedByHub}
                                        <button
                                            class="btn btn-sm preset-filled-error-500 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                                            onclick={() => openRejectDialog(paper)}
                                        >
                                            <Icon icon="mdi:close-circle" width="20" height="20" />
                                            Reject Paper
                                        </button>
                                    {/if}
                                    {#if paper.rejectedByHub}
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-800 text-sm font-medium rounded-lg">
                                            <Icon icon="mdi:close-circle" width="18" height="18" />
                                            Rejected
                                        </span>
                                    {/if}
                                    {#if getAvailableReviewers(paper).length > 0 && !paper.rejectedByHub}
                                        <button
                                            class="btn btn-sm preset-filled-primary-500 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                                            onclick={() => openInviteDialog(paper)}
                                        >
                                            <Icon icon="mdi:account-plus" width="20" height="20" />
                                            Invite Reviewers
                                        </button>
                                    {/if}
                                    {#if paper.reviewers && paper.reviewers.length > 0}
                                        <button
                                            class="btn btn-sm bg-slate-600 hover:bg-slate-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                                            onclick={() => openManageReviewersDialog(paper)}
                                        >
                                            <Icon icon="mdi:account-cog" width="20" height="20" />
                                            Manage Reviewers
                                        </button>
                                        <button
                                            class="btn btn-sm bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1"
                                            onclick={() => openManageDeadlinesDialog(paper)}
                                        >
                                            <Icon icon="mdi:calendar-clock" width="20" height="20" />
                                            Manage Deadlines
                                        </button>
                                    {/if}
                                {/if}
                                <a
                                    href={getReadMoreHref(paper)}
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

<!-- Modal para gerenciar revisores -->
<Modal
    open={openManageReviewersModal}
    onOpenChange={(e) => (openManageReviewersModal = e.open)}
    contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
>
    {#snippet content()}
        {#if selectedPaper}
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                        Manage Reviewers
                    </h3>
                    <button
                        class="btn-icon btn-icon-sm"
                        onclick={() => (openManageReviewersModal = false)}
                    >
                        <Icon icon="mdi:close" class="text-gray-500" />
                    </button>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Paper: <strong>{@html selectedPaper.title}</strong>
                </p>
                
                <div class="space-y-2">
                    <h4 class="font-medium text-gray-900 dark:text-white">Current Reviewers:</h4>
                    {#if selectedPaper.reviewers && selectedPaper.reviewers.length > 0}
                        <div class="space-y-2">
                            {#each selectedPaper.reviewers as reviewer}
                                {@const reviewerId = typeof reviewer === 'object' ? (reviewer._id || reviewer.id) : reviewer}
                                {@const rev = typeof reviewer === 'object' ? reviewer : hub.reviewers?.find(r => {
                                    const rId = typeof r === 'object' ? (r._id || r.id) : r;
                                    return rId === reviewer;
                                })}
                                {#if rev && typeof rev === 'object'}
                                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                                {getInitials(rev.firstName, rev.lastName)}
                                            </div>
                                            <div>
                                                <div class="font-medium text-gray-900 dark:text-white">
                                                    {rev.firstName} {rev.lastName}
                                                </div>
                                                <div class="text-sm text-gray-500">{rev.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            class="btn btn-sm preset-filled-error-500"
                                            onclick={() => removeReviewer(reviewerId)}
                                            disabled={loading}
                                        >
                                            <Icon icon="mdi:delete" class="mr-1" />
                                            Remove
                                        </button>
                                    </div>
                                {:else}
                                    <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                        <p class="text-sm text-yellow-800 dark:text-yellow-200">
                                            Reviewer ID: {reviewerId} (not found in hub reviewers)
                                        </p>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    {:else}
                        <p class="text-gray-500 text-sm">No reviewers assigned yet.</p>
                    {/if}
                </div>
            </div>
        {/if}
    {/snippet}
</Modal>

<!-- Modal para convidar revisores -->
<Modal
    open={openInviteModal}
    onOpenChange={(e) => (openInviteModal = e.open)}
    contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
>
    
    {#snippet content()}
        <header class="flex justify-between items-center border-b pb-2 mb-4">
            <h2 class="text-2xl font-semibold">Invite Hub Reviewers</h2>
        </header>
        
        {#if selectedPaper}
            <div class="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <p class="text-sm text-gray-600 dark:text-gray-400">Paper:</p>
                <p class="font-medium text-gray-900 dark:text-white">{@html selectedPaper.title}</p>
            </div>
            
            {#if getAvailableReviewers(selectedPaper).length === 0}
                <p class="text-center text-gray-500 dark:text-gray-400">
                    All hub reviewers have already been invited to review this paper.
                </p>
            {:else}
                <!-- Search -->
                <div class="relative">
                    <input
                        type="text"
                        bind:value={searchTerm}
                        placeholder="Search reviewers..."
                        class="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-700 dark:text-white"
                    />
                    <Icon
                        icon="mdi:magnify"
                        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                </div>
                <div class="flex items-center justify-between mt-3 mb-1 text-sm text-gray-600 dark:text-gray-300">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200 font-semibold">
                        <Icon icon="mdi:account-multiple" class="size-4" />
                        Selected: {selectedReviewers.length}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">First 3 acceptances occupy slots; extra invites stay pending.</span>
                </div>
                
                <!-- Lista de revisores filtrados -->
                {#if getFilteredReviewers(selectedPaper).length > 0}
                    <div class="max-h-64 overflow-y-auto space-y-3">
                        {#each getFilteredReviewers(selectedPaper) as reviewer}
                            {@const rev = typeof reviewer === 'object' ? reviewer : null}
                            {#if rev}
                                <label
                                    class="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-surface-700 hover:bg-gray-100 dark:hover:bg-surface-600 rounded-lg cursor-pointer transition-colors"
                                >
                                    <div class="flex items-center gap-4">
                                        <div
                                            class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-surface-500"
                                        >
                                            {#if rev.profilePictureUrl}
                                                <img
                                                    src={rev.profilePictureUrl}
                                                    alt={`${rev.firstName}'s profile`}
                                                    class="w-full h-full object-cover"
                                                />
                                            {:else}
                                                <div class="w-full h-full flex items-center justify-center">
                                                    <Icon icon="mdi:account" class="text-2xl text-gray-500" />
                                                </div>
                                            {/if}
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-900 dark:text-white">
                                                {rev.firstName} {rev.lastName}
                                            </div>
                                            <div class="text-sm text-gray-500">{rev.email}</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        class="form-checkbox h-5 w-5 text-primary-600"
                                        checked={selectedReviewers.includes(rev._id || rev.id)}
                                        onchange={() => toggleReviewer(rev._id || rev.id)}
                                    />
                                </label>
                            {/if}
                        {/each}
                    </div>
                    
                    <!-- Botão de adicionar -->
                    <div class="flex justify-end mt-4">
                        <button
                            class="btn preset-filled"
                            onclick={sendInvitations}
                            disabled={selectedReviewers.length === 0 || loading}
                        >
                            <Icon icon="mdi:email-send" class="mr-2" />
                            Send Invitations
                        </button>
                    </div>
                {:else}
                    <p class="text-center text-gray-500 dark:text-gray-400">No reviewers found</p>
                {/if}
            {/if}
        {/if}
    {/snippet}
</Modal>

<!-- Modal para gerenciar deadlines -->
<Modal
    open={openManageDeadlinesModal}
    onOpenChange={(e) => (openManageDeadlinesModal = e.open)}
    contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-3xl w-full sm:w-[90vw]"
>
    {#snippet content()}
        {#if selectedPaper}
            <div class="space-y-4">
                <div class="flex justify-between items-center border-b pb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                            Manage Review Deadlines
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {@html selectedPaper.title}
                        </p>
                    </div>
                    <button
                        class="btn-icon btn-icon-sm"
                        onclick={() => (openManageDeadlinesModal = false)}
                    >
                        <Icon icon="mdi:close" class="text-gray-600" />
                    </button>
                </div>

                {#if selectedPaper.reviewers && selectedPaper.reviewers.length > 0}
                    <div class="space-y-3">
                        {#each selectedPaper.reviewers as reviewerRef, idx}
                            {@const reviewer = typeof reviewerRef === 'object' ? reviewerRef : hub.reviewers?.find((r: any) => {
                                const rId = typeof r === 'object' ? (r._id || r.id) : r;
                                return rId === reviewerRef;
                            })}
                            {@const reviewerId = typeof reviewerRef === 'object' ? (reviewerRef._id || reviewerRef.id) : reviewerRef}
                            {@const assignment = reviewAssignments?.find(a => {
                                const aReviewerId = typeof a.reviewerId === 'object' ? (a.reviewerId._id || a.reviewerId.id) : a.reviewerId;
                                const aPaperId = typeof a.paperId === 'object' ? (a.paperId._id || a.paperId.id) : a.paperId;
                                console.log(`🔍 Checking assignment for reviewer ${idx}:`, {
                                    aReviewerId,
                                    reviewerId,
                                    match: aReviewerId === reviewerId,
                                    aPaperId,
                                    selectedPaperId: selectedPaper.id,
                                    paperMatch: aPaperId === selectedPaper.id,
                                    assignment: a
                                });
                                return aReviewerId === reviewerId && aPaperId === selectedPaper.id;
                            })}
                            {#if idx === 0}
                                {console.log('📊 Modal Debug:', {
                                    reviewAssignmentsLength: reviewAssignments?.length,
                                    selectedPaperId: selectedPaper.id,
                                    reviewerId,
                                    foundAssignment: !!assignment,
                                    assignmentDeadline: assignment?.deadline,
                                    assignmentId: assignment?._id || assignment?.id
                                })}
                            {/if}
                            
                            {#if reviewer}
                                {@const rev = typeof reviewer === 'object' ? reviewer : null}
                                {#if rev}
                                    <div class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
                                        <div class="flex items-center gap-3 flex-1">
                                            {#if rev.profilePictureUrl}
                                                <img
                                                    src={rev.profilePictureUrl}
                                                    alt={rev.firstName}
                                                    class="w-12 h-12 rounded-full"
                                                />
                                            {:else}
                                                <div class="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                                                    {rev.firstName?.[0]}{rev.lastName?.[0]}
                                                </div>
                                            {/if}
                                            <div class="flex-1">
                                                <p class="font-semibold text-gray-900 dark:text-white">
                                                    {rev.firstName} {rev.lastName}
                                                </p>
                                                <p class="text-xs text-gray-600 dark:text-gray-400">
                                                    {rev.email}
                                                </p>
                                                {#if assignment?.deadline}
                                                    {@const deadline = new Date(assignment.deadline)}
                                                    {@const now = new Date()}
                                                    {@const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))}
                                                    <p class="text-xs mt-1 {daysRemaining > 0 ? 'text-green-600' : 'text-red-600'}">
                                                        <Icon icon="mdi:calendar-clock" class="inline size-3" />
                                                        {deadline.toLocaleDateString()} 
                                                        {daysRemaining > 0 ? `(${daysRemaining} days)` : `(${Math.abs(daysRemaining)} days overdue)`}
                                                    </p>
                                                {:else}
                                                    <p class="text-xs mt-1 text-orange-600">
                                                        <Icon icon="mdi:alert-circle" class="inline size-3" />
                                                        No deadline set
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>

                                        <ManageReviewerDeadline
                                            paperId={selectedPaper.id}
                                            reviewer={rev}
                                            currentDeadline={assignment?.deadline}
                                            reviewAssignmentId={assignment?._id || assignment?.id}
                                        />
                                    </div>
                                {/if}
                            {/if}
                        {/each}
                    </div>
                {:else}
                    <div class="text-center p-8 bg-surface-50 dark:bg-surface-900 rounded-lg">
                        <Icon icon="mdi:calendar-blank" class="size-12 mx-auto text-gray-400 mb-2" />
                        <p class="text-gray-600 dark:text-gray-400">
                            No reviewers assigned to this paper yet.
                        </p>
                    </div>
                {/if}
            </div>
        {/if}
    {/snippet}
</Modal>

<!-- Modal para rejeitar paper -->
<Modal
    open={openRejectModal}
    onOpenChange={(e) => (openRejectModal = e.open)}
    contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full"
>
    {#snippet content()}
        {#if selectedPaper}
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-error-600 dark:text-error-400">
                        Reject Paper
                    </h3>
                    <button
                        class="btn-icon btn-icon-sm"
                        onclick={() => (openRejectModal = false)}
                    >
                        <Icon icon="mdi:close" class="text-gray-500" />
                    </button>
                </div>
                
                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">
                        <Icon icon="mdi:alert" class="inline mr-1" width="20" height="20" />
                        <strong>Warning:</strong> Rejecting this paper will notify the author and they will no longer be able to submit it to this hub. This action cannot be undone.
                    </p>
                </div>
                
                <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Paper: <strong class="text-gray-900 dark:text-white">{@html selectedPaper.title}</strong>
                    </p>
                </div>
                
                <div class="space-y-2">
                    <label for="rejection-reason" class="block font-medium text-gray-900 dark:text-white">
                        Reason for Rejection <span class="text-error-600">*</span>
                    </label>
                    <textarea
                        id="rejection-reason"
                        bind:value={rejectionReason}
                        rows="5"
                        class="w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-error-500 focus:border-error-500"
                        placeholder="Please provide a clear reason for rejecting this paper. This will be sent to the author."
                        required
                    ></textarea>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        The author will receive a notification with this message.
                    </p>
                </div>
                
                <div class="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <button
                        class="btn preset-tonal"
                        onclick={() => (openRejectModal = false)}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        class="btn preset-filled-error-500 text-white"
                        onclick={rejectPaper}
                        disabled={loading || !rejectionReason.trim()}
                    >
                        {#if loading}
                            <Icon icon="mdi:loading" class="animate-spin mr-2" width="20" height="20" />
                            Rejecting...
                        {:else}
                            <Icon icon="mdi:close-circle" class="mr-2" width="20" height="20" />
                            Reject Paper
                        {/if}
                    </button>
                </div>
            </div>
        {/if}
    {/snippet}
</Modal>