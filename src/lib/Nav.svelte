<script lang="ts">
	import { Avatar, Popover } from '@skeletonlabs/skeleton-svelte';
	import { post } from './utils';
	import { invalidateAll } from '$app/navigation';
	import type { User } from './types/User';
	import type { Notification } from './types/Notification';
	import { getInitials } from './utils/GetInitials';
	import NotificationBadge from './components/Notifications/NotificationBadge.svelte';
	import Notifications from './components/Notifications/Notifications.svelte';
	import { onMount } from 'svelte';

	interface Props {
		pathname: string;
		user: User;
		notifications?: Notification[];
		unreadCount?: number;
	}

	let { pathname, user, notifications = [], unreadCount = 0 }: Props = $props();

	let openState = $state(false); // popover do avatar
	let showNotifications = $state(false); // popover das notificações
	let currentNotifications = $state(notifications);
	let currentUnreadCount = $state(unreadCount);

	// Atualizar estado quando props mudam
	$effect(() => {
		currentNotifications = notifications;
		currentUnreadCount = unreadCount;
	});

	// Função para atualizar contador de não lidas
	async function updateUnreadCount() {
		try {
			const response = await fetch('/api/notifications/unread-count');
			if (response.ok) {
				const data = await response.json();
				currentUnreadCount = data.count || 0;
			}
		} catch (error) {
			console.error('Error updating unread count:', error);
		}
	}

	// Função para recarregar notificações
	async function reloadNotifications() {
		try {
			const response = await fetch('/api/notifications');
			if (response.ok) {
				const data = await response.json();
				currentNotifications = data.notifications || [];
			}
		} catch (error) {
			console.error('Error reloading notifications:', error);
		}
	}

	// Atualizar contador periodicamente
	onMount(() => {
		const interval = setInterval(updateUnreadCount, 30000); // A cada 30 segundos
		return () => clearInterval(interval);
	});

	// Callback quando notificação é lida/deletada
	function handleNotificationChange() {
		updateUnreadCount();
		// Opcionalmente recarregar todas as notificações
		// reloadNotifications();
	}

	async function logout() {
		await post(`/logout`);
		invalidateAll();
	}

	function removeSpaces(str: string): string {
		return str.replace(/\s+/g, '');
	}

	function getCount(value: string[] | undefined): number {
		return Array.isArray(value) ? value.length : 0;
	}
</script>

{#if user}
	<div class="flex items-center gap-4">
		<!-- Botão de Notificações -->
		<Popover
			open={showNotifications}
			onOpenChange={(e) => {
				showNotifications = e.open;
				// Atualizar contador quando fechar
				if (!e.open) {
					updateUnreadCount();
				}
			}}
			positioning={{ placement: 'bottom-end' }}
			triggerBase="relative"
			contentBase="card bg-surface-950-50 card p-4 w-80 shadow-xl text-surface-50-950 max-h-96 overflow-y-auto"
			arrow
			arrowBackground="!bg-surface-950 dark:!bg-surface-50"
		>
			{#snippet trigger()}
				<NotificationBadge unreadCount={currentUnreadCount} />
			{/snippet}

			{#snippet content()}
				<div class="max-h-80 overflow-y-auto">
					<Notifications
						notifications={currentNotifications}
						on:notificationChange={handleNotificationChange}
					/>
				</div>
			{/snippet}
		</Popover>

		<!-- Popover do Avatar do Usuário -->
		<Popover
			open={openState}
			onOpenChange={(e) => (openState = e.open)}
			positioning={{ placement: 'top-end' }}
			triggerBase=""
			contentBase="card bg-surface-950-50 space-y-4 card p-4 w-72 shadow-xl text-surface-50-950"
			arrow
			arrowBackground="!bg-surface-950 dark:!bg-surface-50"
		>
			{#snippet trigger()}
				{#if user.profilePictureUrl}
					<Avatar src={user.profilePictureUrl} name={user.firstName} size="w-9" />
				{:else}
					<div class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full">
						<span class="text-xl font-bold">{getInitials(user.firstName, user.lastName)}</span>
					</div>
				{/if}
			{/snippet}

			{#snippet content()}
				<div class="space-y-4 flex flex-col">
					<div class="flex gap-2">
						{#if user.profilePictureUrl}
							<Avatar src={user.profilePictureUrl} name={user.firstName} size="w-9" />
						{:else}
							<div
								class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full"
							>
								<span class="text-xl font-bold">{getInitials(user.firstName, user.lastName)}</span>
							</div>
						{/if}
						<div>
							<p class="font-bold">{`${user.firstName} ${user.lastName}`}</p>
							<p class="opacity-50">{user.username}</p>
						</div>
					</div>
					<p>{user.position} at {user.institution}</p>
					<div class="flex gap-4">
						<small
							><strong>{user?.following.length || 0}</strong>
							<span class="opacity-50">Following</span></small
						>
						<small
							><strong>{user?.followers.length || 0}</strong>
							<span class="opacity-50">Followers</span></small
						>
					</div>

					<a
						data-sveltekit-reload
						class="btn bg-primary-500 w-full text-white"
						href={`/profile/${user.username}`}
						target=""
						rel="noreferrer"
					>
						Profile
					</a>
					<button class="btn preset-filled justify-start" onclick={logout}>Sign out</button>
				</div>
			{/snippet}
		</Popover>
	</div>
{:else}
	<a href="/login" class="nav-link" class:active={pathname === '/login'}>Sign in</a>
	<a href="/register" class="nav-link" class:active={pathname === '/register'}>Sign up</a>
{/if}
