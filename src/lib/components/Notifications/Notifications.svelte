<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import Icon from '@iconify/svelte';
    import { toaster } from '$lib/toaster-svelte';

    const dispatch = createEventDispatcher<{ notificationChange: void }>();

    // Types based on NotificationSchema
    interface Notification {
        _id: string;
        id: string;
        user: string;
        type:
            | 'invitation'
            | 'comment'
            | 'connection_request'
            | 'paper_accepted'
            | 'paper_rejected'
            | 'paper_pending_review'
            | 'paper_submitted'
            | 'hub_invitation'
            | 'review_request'
            | 'review_completed'
            | 'system'
            | 'follow'
            | 'mention'
            | 'paper_published'
            | 'hub_paper_pending'
            | 'standalone_paper_pending';
        title: string;
        content: string;
        relatedUser?: string;
        relatedPaperId?: string;
        relatedCommentId?: string;
        relatedHubId?: string;
        relatedReviewId?: string;
        actionUrl?: string;
        metadata?: any;
        isRead: boolean;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        expiresAt?: Date;
        createdAt: Date;
        readAt?: Date;
    }

    // Initialize with props
    let { notifications: initialNotifications = [] } = $props();
    let notifications = $state<Notification[]>(initialNotifications);
    let loading = $state(false);
    let filter = $state<'all' | 'unread' | 'read'>('all');
    let typeFilter = $state<string>('all');

    // Notification type configurations
    const notificationConfig = {
        invitation: { icon: 'mdi:email-outline', color: 'text-blue-500' },
        comment: { icon: 'mdi:comment-outline', color: 'text-green-500' },
        connection_request: { icon: 'mdi:account-plus-outline', color: 'text-purple-500' },
        paper_accepted: { icon: 'mdi:check-circle-outline', color: 'text-green-500' },
        paper_rejected: { icon: 'mdi:close-circle-outline', color: 'text-red-500' },
        paper_pending_review: { icon: 'mdi:clock-outline', color: 'text-yellow-500' },
        paper_submitted: { icon: 'mdi:file-document-outline', color: 'text-blue-500' },
        hub_invitation: { icon: 'mdi:hub-outline', color: 'text-indigo-500' },
        review_request: { icon: 'mdi:clipboard-text-outline', color: 'text-orange-500' },
        review_completed: { icon: 'mdi:clipboard-check-outline', color: 'text-green-500' },
        system: { icon: 'mdi:cog-outline', color: 'text-gray-500' },
        follow: { icon: 'mdi:account-heart-outline', color: 'text-pink-500' },
        mention: { icon: 'mdi:at', color: 'text-blue-500' },
        paper_published: { icon: 'mdi:publish', color: 'text-green-500' },
        hub_paper_pending: { icon: 'mdi:hub-outline', color: 'text-yellow-500' },
        standalone_paper_pending: { icon: 'mdi:file-clock-outline', color: 'text-yellow-500' }
    };

    // Priority colors
    const priorityColors = {
        low: 'border-l-gray-300',
        medium: 'border-l-blue-400',
        high: 'border-l-orange-400',
        urgent: 'border-l-red-500'
    };

    // Update local state when props change
    $effect(() => {
        if (initialNotifications && initialNotifications.length > 0) {
            notifications = initialNotifications;
        }
    });

    // helper to notify parent about changes
    function notifyChange() {
        dispatch('notificationChange');
    }

    // Filtered notifications
    const filteredNotifications = $derived(() => {
        let filtered = notifications;

        // Filter by read status
        if (filter === 'unread') {
            filtered = filtered.filter((n) => !n.isRead);
        } else if (filter === 'read') {
            filtered = filtered.filter((n) => n.isRead);
        }

        // Filter by type
        if (typeFilter !== 'all') {
            filtered = filtered.filter((n) => n.type === typeFilter);
        }

        // Sort by priority and date
        return [...filtered].sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority];
            const bPriority = priorityOrder[b.priority];

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    });

    // Get unique notification types for filter
    const availableTypes = $derived(() => {
        const types = [...new Set(notifications.map((n) => n.type))];
        return types.sort();
    });

    async function loadNotifications() {
        if (notifications.length > 0) {
            return;
        }

        loading = true;
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            const data = await response.json();
            notifications = data.notifications || [];
            // inform parent that notifications were loaded
            notifyChange();
        } catch (error) {
            console.error('Error loading notifications:', error);
            toaster.error({
                title: 'Error',
                description: 'Failed to load notifications'
            });
        } finally {
            loading = false;
        }
    }

    async function markAsRead(notificationId: string) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });

            if (response.ok) {
                notifications = notifications.map((n) =>
                    n._id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
                );
                notifyChange();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function markAllAsRead() {
        loading = true;
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });

            if (response.ok) {
                notifications = notifications.map((n) => ({ ...n, isRead: true, readAt: new Date() }));
                toaster.success({
                    title: 'Success',
                    description: 'All notifications marked as read'
                });
                notifyChange();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            toaster.error({
                title: 'Error',
                description: 'Failed to mark all notifications as read'
            });
        } finally {
            loading = false;
        }
    }

    async function deleteNotification(notificationId: string) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                notifications = notifications.filter((n) => n._id !== notificationId);
                toaster.success({
                    title: 'Success',
                    description: 'Notification deleted'
                });
                notifyChange();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            toaster.error({
                title: 'Error',
                description: 'Failed to delete notification'
            });
        }
    }

    function handleNotificationClick(notification: Notification) {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }

        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    }

    function getTimeAgo(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    onMount(loadNotifications);
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">Notifications</h2>
		<div class="flex gap-2">
			<button
				class="btn btn-sm px-2 py-1 text-xs preset-tonal-primary"
				disabled={loading}
				onclick={markAllAsRead}
			>
				<Icon icon="mdi:check-all" class="mr-1 w-4 h-4" />
				Mark all
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex gap-4 flex-wrap">
		<div class="flex gap-2">
			<button
				class="btn {filter === 'all' ? 'preset-filled-primary' : 'preset-tonal'}"
				onclick={() => (filter = 'all')}
			>
				All
			</button>
			<button
				class="btn {filter === 'unread' ? 'preset-filled-primary' : 'preset-tonal'}"
				onclick={() => (filter = 'unread')}
			>
				Unread ({notifications.filter((n) => !n.isRead).length})
			</button>
			<button
				class="btn {filter === 'read' ? 'preset-filled-primary' : 'preset-tonal'}"
				onclick={() => (filter = 'read')}
			>
				Read
			</button>
		</div>

		<select class="select preset-tonal" bind:value={typeFilter}>
			<option value="all">All types</option>
			{#each availableTypes() as type}
				<option value={type as string}
					>{(type as string).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option
				>
			{/each}
		</select>
	</div>

	<!-- Notifications List -->
	<div class="space-y-2">
		{#if loading}
			<div class="card p-4">
				<p class="text-sm text-gray-500">Loading notifications...</p>
			</div>
		{:else if filteredNotifications().length === 0}
			<p class="text-sm text-gray-400">No notifications to show.</p>
		{:else}
			{#each filteredNotifications() as notification (notification._id)}
				<div
					class="card p-4 border-l-4 {priorityColors[notification.priority]} 
						   {!notification.isRead ? 'bg-blue-50/50' : ''} 
						   {notification.actionUrl ? 'cursor-pointer hover:bg-gray-50' : ''}"
					onclick={() => handleNotificationClick(notification)}
					role={notification.actionUrl ? 'button' : 'article'}
					{...notification.actionUrl ? { tabindex: 0 } : {}}
				>
					<div class="flex items-start justify-between">
						<div class="flex items-start gap-3 flex-1">
							<!-- Icon -->
							<div class="flex-shrink-0 mt-1">
								<Icon
									icon={notificationConfig[notification.type]?.icon || 'mdi:bell-outline'}
									class="w-5 h-5 {notificationConfig[notification.type]?.color || 'text-gray-500'}"
								/>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-medium text-sm">{notification.title}</h3>
									{#if !notification.isRead}
										<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
									{/if}
									{#if notification.priority === 'urgent'}
										<span class="badge preset-filled-error text-xs">Urgent</span>
									{:else if notification.priority === 'high'}
										<span class="badge preset-filled-warning text-xs">High</span>
									{/if}
								</div>

								<p class="text-sm text-gray-600 mb-2">{notification.content}</p>

								<div class="flex items-center gap-4 text-xs text-gray-500">
									<span>{getTimeAgo(notification.createdAt)}</span>
									<span class="capitalize">{notification.type.replace(/_/g, ' ')}</span>
									{#if notification.expiresAt}
										<span>Expires: {new Date(notification.expiresAt).toLocaleDateString()}</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex gap-1 flex-shrink-0">
							{#if !notification.isRead}
								<button
									class="btn btn-sm preset-tonal"
									onclick={(e) => {
										e.stopPropagation();
										markAsRead(notification._id);
									}}
									title="Mark as read"
								>
									<Icon icon="mdi:check" class="w-4 h-4" />
								</button>
							{/if}

							<button
								class="btn btn-sm preset-tonal-error"
								onclick={(e) => {
									e.stopPropagation();
									deleteNotification(notification._id);
								}}
								title="Delete notification"
							>
								<Icon icon="mdi:delete-outline" class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.card {
		transition: all 0.2s ease-in-out;
	}

	.card:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
</style>
