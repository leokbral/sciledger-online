<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    import { formatDistance } from 'date-fns';
    import { ptBR } from 'date-fns/locale';

    export let data: PageData;

    let highlightedNotificationId = '';

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

    async function markAsRead(notificationId: string) {
        try {
            const response = await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notificationId })
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
</script>

<svelte:head>
    <title>Notifications - SciLedger</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-2">
                Stay updated with the latest activities
            </p>
        </header>

        {#if data.notifications.length === 0}
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🔔</div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No notifications
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                    You're all caught up! There are no notifications at the moment.
                </p>
            </div>
        {:else}
            <div class="space-y-4">
                {#each data.notifications as notification (notification._id)}
                    <div
                        id="notification-{notification.relatedPaperId || notification._id}"
                        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 {getPriorityClass(notification.priority || 'normal')} 
                        {!notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''} 
                        {highlightedNotificationId === notification.relatedPaperId ? 'ring-2 ring-blue-500' : ''} 
                        transition-all duration-300"
                    >
                        <div class="p-6">
                            <div class="flex items-start justify-between">
                                <div class="flex items-start space-x-3 flex-1">
                                    <div class="text-2xl">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center space-x-2 mb-1">
                                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                                                {notification.title}
                                            </h3>
                                            {#if !notification.isRead}
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    New
                                                </span>
                                            {/if}
                                        </div>
                                        <p class="text-gray-600 dark:text-gray-400 mb-3">
                                            {notification.content}
                                        </p>
                                        <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span>
                                                {formatDistance(new Date(notification.createdAt), new Date(), {
                                                    addSuffix: true,
                                                    locale: ptBR
                                                })}
                                            </span>
                                            <!-- {#if notification.priority && notification.priority !== 'normal'} -->
                                            {#if notification.priority === 'high' || notification.priority === 'medium'}
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                                    {notification.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                                                    {notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                                                ">
                                                    {notification.priority === 'high' ? 'High priority' : ''}
                                                    {notification.priority === 'medium' ? 'Medium priority' : ''}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    {#if !notification.isRead}
                                        <button
                                            on:click={() => markAsRead(notification._id)}
                                            class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            Mark as read
                                        </button>
                                    {/if}
                                    {#if notification.actionUrl}
                                        <a
                                            href={`/review/paperspool/${notification.relatedPaperId}`}
                                            class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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