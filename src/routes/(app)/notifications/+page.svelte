<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    import { formatDistance } from 'date-fns';
    import { ptBR } from 'date-fns/locale';
    import Icon from '@iconify/svelte';
    import { toaster } from '$lib/toaster-svelte';

    export let data: PageData;

    let highlightedNotificationId = '';
    let loadingInvite = '';

    onMount(() => {
        // Verificar se há um parâmetro highlight na URL
        const highlight = $page.url.searchParams.get('highlight');
        if (highlight) {
            highlightedNotificationId = highlight;
            // Scroll para a notificação destacada após um pequeno delay
            setTimeout(() => {
                const element = document.getElementById(`notification-${highlight}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
    });

    async function handleHubInvitation(inviteId: string, action: 'accept' | 'reject') {
        loadingInvite = inviteId;
        try {
            const response = await fetch(`/api/reviewer-invitations/${inviteId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                data.hubInvitations = data.hubInvitations.filter(invite => invite._id !== inviteId);
                toaster.success({
                    title: action === 'accept' ? 'Invitation Accepted' : 'Invitation Declined',
                    description: `Successfully ${action}ed the invitation`
                });
                // Reload page to update notifications
                window.location.reload();
            } else {
                toaster.error({
                    title: 'Error',
                    description: `Failed to ${action} invitation`
                });
            }
        } catch (error) {
            console.error(`Error ${action}ing invitation:`, error);
            toaster.error({
                title: 'Error',
                description: `Failed to ${action} invitation`
            });
        } finally {
            loadingInvite = '';
        }
    }

    async function handlePaperReviewInvitation(inviteId: string, action: 'accept' | 'decline') {
        loadingInvite = inviteId;
        try {
            const response = await fetch(`/api/paper-reviewer-invitations/${inviteId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const result = await response.json();

            if (response.ok) {
                data.paperReviewInvitations = data.paperReviewInvitations.filter(
                    invite => invite._id !== inviteId && invite.id !== inviteId
                );
                toaster.success({
                    title: action === 'accept' ? 'Invitation Accepted' : 'Invitation Declined',
                    description: result.message || `Successfully ${action}ed the review invitation`
                });
                // Reload page to update notifications
                window.location.reload();
            } else {
                const reasons = Array.isArray(result?.reasons) ? result.reasons.join(', ') : '';
                toaster.error({
                    title: 'Error',
                    description: reasons ? `${result.error}: ${reasons}` : (result.error || `Failed to ${action} invitation`)
                });
            }
        } catch (error) {
            console.error(`Error ${action}ing paper review invitation:`, error);
            toaster.error({
                title: 'Error',
                description: `Failed to ${action} invitation`
            });
        } finally {
            loadingInvite = '';
        }
    }

    async function markAsRead(notificationId: string) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });

            if (response.ok) {
                // Atualizar a notificação na lista
                const notificationIndex = data.notifications.findIndex(n => n._id === notificationId);
                if (notificationIndex !== -1) {
                    data.notifications[notificationIndex].isRead = true;
                    data.notifications = [...data.notifications];
                }
            }
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    }

    function getNotificationIcon(type: string) {
        switch (type) {
            case 'review_request':
                return '📝';
            case 'paper_pending_review':
                return '⏳';
            case 'paper_accepted_for_review':
                return '✅';
            case 'review_completed':
                return '🎯';
            case 'paper_accepted':
                return '🎉';
            case 'paper_rejected':
                return '❌';
            case 'connection_request':
                return '👥';
            case 'comment':
                return '💬';
            default:
                return '🔔';
        }
    }

    function getPriorityClass(priority: string) {
        switch (priority) {
            case 'high':
                return 'border-l-red-500';
            case 'medium':
                return 'border-l-yellow-500';
            case 'low':
                return 'border-l-green-500';
            default:
                return 'border-l-blue-500';
        }
    }

    function getPriorityLabel(priority: string) {
        switch (priority) {
            case 'urgent':
                return 'Urgent';
            case 'high':
                return 'High priority';
            case 'medium':
                return 'Medium priority';
            default:
                return 'Low priority';
        }
    }

    function getNotificationAccent(notification: any) {
        switch (notification.type) {
            case 'paper_accepted_for_review':
            case 'paper_published':
            case 'review_completed':
                return 'from-emerald-500 to-teal-500';
            case 'paper_rejected':
            case 'paper_final_rejection':
                return 'from-rose-500 to-red-500';
            case 'hub_invitation':
            case 'review_request':
                return 'from-indigo-500 to-sky-500';
            case 'paper_submitted':
            case 'hub_paper_pending':
            case 'standalone_paper_pending':
                return 'from-amber-500 to-orange-500';
            default:
                return 'from-slate-500 to-slate-600';
        }
    }
</script>

<svelte:head>
    <title>Notifications - SciLedger</title>
</svelte:head>

<div class="relative overflow-hidden">
    <div class="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary-600/12 via-primary-500/8 to-transparent blur-3xl"></div>
    <div class="container mx-auto px-4 py-8">
        <div class="mx-auto max-w-5xl">
            <header class="mb-8 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-surface-700 dark:bg-surface-900/80">
                <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p class="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                            Activity Center
                        </p>
                        <h1 class="text-3xl font-bold tracking-tight text-surface-950 dark:text-white md:text-4xl">Notifications</h1>
                        <p class="mt-2 max-w-2xl text-sm leading-6 text-surface-600 dark:text-surface-300">
                            Track submissions, review events, invitations, and status updates in one clean timeline.
                        </p>
                    </div>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="rounded-2xl border border-surface-200 bg-white px-4 py-3 text-center shadow-sm dark:border-surface-700 dark:bg-surface-950">
                            <div class="text-xl font-bold text-surface-900 dark:text-white">{data.notifications.filter((n) => !n.isRead).length}</div>
                            <div class="text-xs text-surface-500">Unread</div>
                        </div>
                        <div class="rounded-2xl border border-surface-200 bg-white px-4 py-3 text-center shadow-sm dark:border-surface-700 dark:bg-surface-950">
                            <div class="text-xl font-bold text-surface-900 dark:text-white">{data.notifications.length}</div>
                            <div class="text-xs text-surface-500">Total</div>
                        </div>
                        <div class="rounded-2xl border border-surface-200 bg-white px-4 py-3 text-center shadow-sm dark:border-surface-700 dark:bg-surface-950">
                            <div class="text-xl font-bold text-surface-900 dark:text-white">{data.hubInvitations?.length || 0}</div>
                            <div class="text-xs text-surface-500">Invites</div>
                        </div>
                    </div>
                </div>
            </header>

        <!-- Hub Invitations Section -->
        {#if data.hubInvitations && data.hubInvitations.length > 0}
            <section class="mb-8 rounded-3xl border border-surface-200 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-surface-700 dark:bg-surface-900/80">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xl font-semibold text-surface-950 dark:text-white">Hub Invitations</h2>
                        <p class="text-sm text-surface-500">Accept or decline review invitations from hubs.</p>
                    </div>
                    <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">{data.hubInvitations.length} pending</span>
                </div>
                <div class="space-y-4">
                    {#each data.hubInvitations as invite (invite._id)}
                        <div class="overflow-hidden rounded-2xl border border-surface-200 bg-surface-50/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-surface-700 dark:bg-surface-950/60">
                            <div class="h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
                            <div class="flex items-center justify-between gap-4 p-5">
                                <div class="flex items-center gap-4">
                                    {#if invite.hubId?.logoUrl}
                                        <img
                                            src={`/api/images/${invite.hubId.logoUrl}`}
                                            alt="Hub logo"
                                            class="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                                        />
                                    {:else}
                                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white shadow-sm">
                                            {invite.hubId?.title?.substring(0, 2).toUpperCase() || 'HB'}
                                        </div>
                                    {/if}
                                    <div>
                                        <p class="font-semibold text-surface-950 dark:text-white">
                                            Invitation to review: {invite.hubId?.title || 'Unknown Hub'}
                                        </p>
                                        <p class="text-sm text-surface-500">
                                            {invite.hubId?.type || 'Hub'} • Received {new Date(invite.createdAt).toLocaleDateString()}
                                        </p>
                                        {#if invite.hubId?.description}
                                            <p class="mt-1 line-clamp-2 text-xs text-surface-500">{invite.hubId.description}</p>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex gap-2 flex-shrink-0">
                                    <button
                                        class="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                        disabled={loadingInvite === invite._id}
                                        onclick={() => handleHubInvitation(invite._id, 'accept')}
                                    >
                                        <Icon icon="mdi:check" class="mr-2" />
                                        Accept
                                    </button>
                                    <button
                                        class="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                                        disabled={loadingInvite === invite._id}
                                        onclick={() => handleHubInvitation(invite._id, 'reject')}
                                    >
                                        <Icon icon="mdi:close" class="mr-2" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Paper Review Invitations Section -->
        {#if data.paperReviewInvitations && data.paperReviewInvitations.length > 0}
            <section class="mb-8 rounded-3xl border border-surface-200 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-surface-700 dark:bg-surface-900/80">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xl font-semibold text-surface-950 dark:text-white">Paper Review Invitations</h2>
                        <p class="text-sm text-surface-500">Review requests waiting for your response.</p>
                    </div>
                    <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">{data.paperReviewInvitations.length} pending</span>
                </div>
                <div class="space-y-4">
                    {#each data.paperReviewInvitations as invite (invite._id || invite.id)}
                        <div class="overflow-hidden rounded-2xl border border-surface-200 bg-surface-50/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-surface-700 dark:bg-surface-950/60">
                            <div class="h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                            <div class="p-5">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                                            <Icon icon="mdi:file-document-edit" class="text-lg" />
                                        </div>
                                        <div>
                                            <p class="font-semibold text-surface-950 dark:text-white text-lg">
                                                Paper Review Request
                                            </p>
                                            <p class="text-sm text-surface-500">
                                                {invite.hubId?.title || 'Unknown Hub'} • Received {new Date(invite.invitedAt || invite.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div class="mt-3 pl-8">
                                        <p class="mb-1 font-medium text-surface-950 dark:text-white">
                                            {@html invite.paper?.title || 'Untitled Paper'}
                                        </p>
                                        {#if invite.paper?.abstract}
                                            <p class="mb-2 line-clamp-3 text-sm text-surface-600 dark:text-surface-300">
                                                {@html invite.paper.abstract}
                                            </p>
                                        {/if}
                                        {#if invite.invitedBy}
                                            <p class="text-xs text-surface-500">
                                                Invited by: {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                                            </p>
                                        {/if}
                                        
                                        <!-- Read More Link -->
                                        {#if invite.paper?.id}
                                            <a 
                                                href="/review/paperspool/{invite.paper.id}"
                                                class="mt-3 inline-flex items-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                <Icon icon="mdi:book-open-page-variant" class="mr-1" />
                                                Read full abstract and review details
                                                <Icon icon="mdi:arrow-right" class="ml-1" />
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                                
                                <div class="flex gap-2 flex-shrink-0">
                                    <button
                                        class="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                        disabled={loadingInvite === invite._id || loadingInvite === invite.id}
                                        onclick={() => handlePaperReviewInvitation(invite.id || invite._id, 'accept')}
                                    >
                                        <Icon icon="mdi:check" class="mr-2" />
                                        Accept
                                    </button>
                                    <button
                                        class="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                                        disabled={loadingInvite === invite._id || loadingInvite === invite.id}
                                        onclick={() => handlePaperReviewInvitation(invite.id || invite._id, 'decline')}
                                    >
                                        <Icon icon="mdi:close" class="mr-2" />
                                        Decline
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Notifications Section -->
        {#if data.notifications.length === 0}
            <div class="rounded-3xl border border-dashed border-surface-300 bg-white/70 py-16 text-center shadow-sm backdrop-blur dark:border-surface-700 dark:bg-surface-900/70">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3xl text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">🔔</div>
                <h3 class="mb-2 text-xl font-semibold text-surface-950 dark:text-white">
                    No notifications
                </h3>
                <p class="text-sm text-surface-600 dark:text-surface-300">
                    You're all caught up! There are no notifications at the moment.
                </p>
            </div>
        {:else}
            <div class="space-y-4">
                {#each data.notifications as notification (notification._id)}
                    <div
                        id="notification-{notification.relatedPaperId || notification._id}"
                        class="group overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm transition-all duration-300 {getPriorityClass(notification.priority || 'normal')} 
                        {!notification.isRead ? 'bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-950/30' : 'bg-white dark:bg-surface-900'} 
                        {highlightedNotificationId === notification.relatedPaperId ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-surface-950' : ''} 
                        hover:-translate-y-0.5 hover:shadow-lg dark:border-surface-700"
                    >
                        <div class="h-1 bg-gradient-to-r {getNotificationAccent(notification)}"></div>
                        <div class="p-6">
                            <div class="flex items-start justify-between">
                                <div class="flex items-start space-x-3 flex-1">
                                    <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-100 text-2xl shadow-sm dark:bg-surface-800">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="mb-2 flex flex-wrap items-center gap-2">
                                            <h3 class="text-lg font-semibold text-surface-950 dark:text-white">
                                                {notification.title}
                                            </h3>
                                            {#if !notification.isRead}
                                                <span class="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                                                    New
                                                </span>
                                            {/if}
                                            <span class="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                                                {getPriorityLabel(notification.priority || 'low')}
                                            </span>
                                        </div>
                                        <p class="mb-4 text-sm leading-6 text-surface-600 dark:text-surface-300">
                                            {@html notification.content}
                                        </p>
                                        <div class="flex flex-wrap items-center gap-3 text-sm text-surface-500 dark:text-surface-400">
                                            <span>{formatDistance(new Date(notification.createdAt), new Date(), { addSuffix: true, locale: ptBR })}</span>
                                            {#if notification.expiresAt}
                                                <span>Expires {new Date(notification.expiresAt).toLocaleDateString()}</span>
                                            {/if}
                                            {#if notification.relatedPaperId}
                                                <span class="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">Paper update</span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    {#if !notification.isRead}
                                        <button
                                            onclick={() => markAsRead(notification._id)}
                                            class="inline-flex items-center rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 dark:border-surface-700 dark:bg-surface-950 dark:text-primary-300 dark:hover:bg-primary-900/20"
                                        >
                                            Mark as read
                                        </button>
                                    {/if}
                                    {#if notification.actionUrl}
                                        <a
                                            href={`/review/paperspool/${notification.relatedPaperId}`}
                                            class="inline-flex items-center rounded-xl bg-surface-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-surface-800 dark:bg-surface-100 dark:text-surface-950 dark:hover:bg-white"
                                        >
                                            View details
                                        </a>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
        </div>
    </div>
</div>
