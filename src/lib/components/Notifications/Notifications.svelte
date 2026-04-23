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
			| 'standalone_paper_pending'
			| 'paper_accepted_for_review'
			| 'reviewer_assigned'
			| 'reviewer_accepted_review'
			| 'reviewer_declined_review'
			| 'hub_reviewer_accepted'
			| 'hub_reviewer_declined'
			| 'invitation_cancelled'
			| 'review_submitted'
			| 'corrections_submitted'
			| 'paper_final_acceptance'
			| 'paper_final_rejection';
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
		standalone_paper_pending: { icon: 'mdi:file-clock-outline', color: 'text-yellow-500' },
		paper_accepted_for_review: { icon: 'mdi:check-circle', color: 'text-emerald-500' },
		reviewer_assigned: { icon: 'mdi:account-arrow-right', color: 'text-blue-600' },
		reviewer_accepted_review: { icon: 'mdi:account-check', color: 'text-green-600' },
		reviewer_declined_review: { icon: 'mdi:account-remove', color: 'text-rose-600' },
		hub_reviewer_accepted: { icon: 'mdi:account-check-outline', color: 'text-emerald-600' },
		hub_reviewer_declined: { icon: 'mdi:account-cancel-outline', color: 'text-slate-500' },
		invitation_cancelled: { icon: 'mdi:close-circle-outline', color: 'text-slate-500' },
		review_submitted: { icon: 'mdi:clipboard-check', color: 'text-teal-500' },
		corrections_submitted: { icon: 'mdi:pencil-circle', color: 'text-amber-500' },
		paper_final_acceptance: { icon: 'mdi:trophy', color: 'text-yellow-500' },
		paper_final_rejection: { icon: 'mdi:close-circle', color: 'text-red-600' }
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

	function getNotificationTargetUrl(notification: Notification): string | null {
		if (
			notification.relatedPaperId &&
			(notification.type.includes('review') ||
				notification.type.includes('paper') ||
				notification.type.includes('reviewer'))
		) {
			return '/notifications';
		}

		return notification.actionUrl || null;
	}

	function handleNotificationClick(notification: Notification) {
		if (!notification.isRead) {
			markAsRead(notification._id);
		}

		const targetUrl = getNotificationTargetUrl(notification);
		if (targetUrl) {
			window.location.href = targetUrl;
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

<div class="space-y-5">
	<div
		class="sticky top-0 z-10 -mx-1 bg-white/90 px-1 py-1 backdrop-blur-sm dark:bg-surface-900/90"
	>
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold tracking-tight text-surface-900 dark:text-surface-50">
				Notifications
			</h2>
			<div class="flex gap-2">
				<button
					class="btn btn-sm px-3 py-1.5 text-sm font-semibold preset-tonal-primary"
					disabled={loading}
					onclick={markAllAsRead}
				>
					<Icon icon="mdi:check-all" class="mr-1 w-4 h-4" />
					Mark all
				</button>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex gap-3 flex-wrap items-center">
		<span
			class="text-xs font-semibold uppercase tracking-wide text-surface-600 dark:text-surface-300"
			>Status</span
		>
		<div
			class="flex gap-2 rounded-xl border border-surface-300 bg-surface-50 p-1.5 dark:border-surface-600 dark:bg-surface-800"
		>
			<button
				class="btn btn-sm text-sm font-semibold {filter === 'all'
					? 'bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500'
					: 'bg-white text-surface-800 hover:bg-surface-100 dark:bg-surface-700 dark:text-surface-100 dark:hover:bg-surface-600'}"
				onclick={() => (filter = 'all')}
			>
				All
			</button>
			<button
				class="btn btn-sm text-sm font-semibold {filter === 'unread'
					? 'bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500'
					: 'bg-white text-surface-800 hover:bg-surface-100 dark:bg-surface-700 dark:text-surface-100 dark:hover:bg-surface-600'}"
				onclick={() => (filter = 'unread')}
			>
				Unread ({notifications.filter((n) => !n.isRead).length})
			</button>
			<button
				class="btn btn-sm text-sm font-semibold {filter === 'read'
					? 'bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500'
					: 'bg-white text-surface-800 hover:bg-surface-100 dark:bg-surface-700 dark:text-surface-100 dark:hover:bg-surface-600'}"
				onclick={() => (filter = 'read')}
			>
				Read
			</button>
		</div>

		<span
			class="text-xs font-semibold uppercase tracking-wide text-surface-600 dark:text-surface-300"
			>Type</span
		>
		<select
			class="select h-10 rounded-xl border border-surface-300 bg-white px-3 text-sm font-medium text-surface-900 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
			bind:value={typeFilter}
		>
			<option value="all">All types</option>
			{#each availableTypes() as type}
				<option value={type as string}
					>{(type as string).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option
				>
			{/each}
		</select>
	</div>

	<!-- Notifications List -->
	<div class="space-y-3">
		{#if loading}
			<div
				class="card rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800"
			>
				<p class="text-sm text-gray-500">Loading notifications...</p>
			</div>
		{:else if filteredNotifications().length === 0}
			<div
				class="rounded-xl border border-dashed border-surface-300 bg-surface-50 p-6 text-center text-sm text-surface-500 dark:border-surface-700 dark:bg-surface-800"
			>
				No notifications to show.
			</div>
		{:else}
			{#each filteredNotifications() as notification (notification._id)}
				<div
					class="card rounded-2xl border border-surface-200 p-4 shadow-sm transition-all {priorityColors[
						notification.priority
					]} 
                           {!notification.isRead ? 'bg-blue-50/60' : 'bg-white'} 
                           {getNotificationTargetUrl(notification)
						? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-surface-300'
						: ''}"
					onclick={() => handleNotificationClick(notification)}
					role={getNotificationTargetUrl(notification) ? 'button' : 'article'}
					{...getNotificationTargetUrl(notification) ? { tabindex: 0 } : {}}
				>
					<div class="flex items-start justify-between">
						<div class="flex items-start gap-4 flex-1">
							<!-- Icon -->
							<div
								class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800"
							>
								<Icon
									icon={notificationConfig[notification.type]?.icon || 'mdi:bell-outline'}
									class="h-5 w-5 {notificationConfig[notification.type]?.color || 'text-gray-500'}"
								/>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="mb-1.5 flex items-center gap-2">
									<h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
										{notification.title}
									</h3>
									{#if !notification.isRead}
										<span class="w-2 h-2 bg-blue-500 rounded-full"></span>
									{/if}
									{#if notification.priority === 'urgent'}
										<span class="badge preset-filled-error text-xs">Urgent</span>
									{:else if notification.priority === 'high'}
										<span class="badge preset-filled-warning text-xs">High</span>
									{/if}
								</div>

								<p
									class="mb-3 whitespace-normal break-words text-sm leading-relaxed text-surface-600 dark:text-surface-300"
								>
									{@html notification.content}
								</p>

								<div class="flex flex-wrap items-center gap-3 text-xs text-surface-500">
									<span>{getTimeAgo(notification.createdAt)}</span>
									<span class="capitalize">{notification.type.replace(/_/g, ' ')}</span>
									{#if notification.expiresAt}
										<span>Expires: {new Date(notification.expiresAt).toLocaleDateString()}</span>
									{/if}
									{#if getNotificationTargetUrl(notification)}
										<button
											class="btn btn-xs preset-filled-primary-500 ml-auto"
											onclick={(e) => {
												e.stopPropagation();
												const targetUrl = getNotificationTargetUrl(notification);
												if (targetUrl) {
													window.location.href = targetUrl;
												}
											}}
										>
											Read more
										</button>
									{/if}
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex flex-shrink-0 gap-1">
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
