<script lang="ts">
	import { Avatar, Popover } from '@skeletonlabs/skeleton-svelte';
	import { post } from './utils';
	import { invalidateAll } from '$app/navigation';
	import type { User } from './types/User';
	import { getInitials } from './utils/GetInitials';
	import ReviewerInvitations from './components/ReviewerInvitations/ReviewerInvitations.svelte';

	interface Props {
		pathname: string;
		user: User;
		// reviewerInvitations: ReviewerInvitations;
	}

	let { pathname, user/* , reviewerInvitations */ }: Props = $props();

	let openState = $state(false); // popover do avatar
	let showNotifications = $state(false); // popover das notificações

	let notifications = [
		{ id: 1, message: 'You have a new follower!' },
		{ id: 2, message: 'Your post was liked!' },
		{ id: 3, message: 'New comment on your photo.' }
	];

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
		<!-- <Popover
			open={showNotifications}
			onOpenChange={(e) => (showNotifications = e.open)}
			positioning={{ placement: 'bottom-end' }}
			triggerBase="relative"
			contentBase="card bg-surface-950-50 card p-4 w-72 shadow-xl text-surface-50-950"
			arrow
			arrowBackground="!bg-surface-950 dark:!bg-surface-50"
		>
			{#snippet trigger()}
				<button
					class="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
					aria-label="Open notifications"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-6 h-6 text-gray-600 dark:text-gray-300"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path
							d="M12 24c1.104 0 2-.896 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5c0-3.075-1.725-5.64-4.5-6.32V6a1.5 1.5 0 0 0-3 0v.68C7.725 7.36 6 9.925 6 13v5l-2 2v1h16v-1l-2-2Z"
						/>
					</svg>
				</button>
			{/snippet}

			{#snippet content()}
				<h4 class="font-bold mb-2">Notifications</h4>
				{#if notifications.length > 0}
					<ul class="space-y-2">
						{#each notifications as note}
							<li class="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
								<ReviewerInvitations {reviewerInvitations} />
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-gray-400">No notifications</p>
				{/if}

				<! -- Passando o componente de convites aqui - ->
				<! -- <h3 class="font-bold text-lg mb-2">Reviewer Invitations</h3>
				<ReviewerInvitations {reviewerInvitations} /> - ->
			{/snippet}
		</Popover> -->

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
