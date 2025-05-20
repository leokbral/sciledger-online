<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { User } from '$lib/types/User';
	import type { ReviewQueue } from '$lib/types/ReviewQueue';

	// Props
	const { hubId, isCreator, users } = $props<{
		hubId: string;
		isCreator: boolean;
		users: {
			_id: string;
			firstName: string;
			lastName: string;
			email: string;
			profilePicture?: string;
		}[];
	}>();

	// State
	let reviewers = $state<typeof users>([]);
	let selectedUsers = $state<string[]>([]);
	let openModal = $state(false);
	let loading = $state(false);
	let searchTerm = $state('');
	let filteredUsers = $state<typeof users>([]);
	let pendingInvites = $state<ReviewQueue[]>([]);

	// Load reviewers do hub
	async function loadReviewers() {
		try {
			const response = await fetch(`/hub/view/${hubId}/reviewers`);
			const data = await response.json();
			if (response.ok) {
				reviewers = data.reviewers;
				filterUsers();
			}
		} catch (error) {
			console.error('Error loading reviewers:', error);
		}
	}

	// Load pending invites
	async function loadPendingInvites() {
		try {
			const response = await fetch(`/hub/view/${hubId}/reviewer-invites`);
			const data = await response.json();
			if (response.ok) {
				pendingInvites = data.invites;
				filterUsers();
			}
		} catch (error) {
			console.error('Error loading pending invites:', error);
		}
	}

	// Filtra usuários com base no input e removendo quem já é revisor
	function filterUsers() {
		const reviewerIds = new Set(reviewers.map((r: { _id: any }) => r._id));
		filteredUsers = users.filter((user: User) => {
			const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
			const notReviewer = !reviewerIds.has(user.id);
			return notReviewer && fullName.includes(searchTerm.toLowerCase());
		});
	}

	// Atualiza filtros e lista ao abrir modal
	$effect(() => {
		if (openModal) {
			loadReviewers();
			loadPendingInvites();
		}
	});

	$effect(() => {
		filterUsers();
	});

	// Adicionar ou remover revisores
	async function manageReviewers(action: 'invite' | 'remove', userIds: string[]) {
		loading = true;
		try {
			if (action === 'invite') {
				// Create invitations for each selected user
				const promises = userIds.map(async (reviewerId) => {
					const response = await fetch('/api/reviewer-invitations', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							hubId,
							reviewerId
						})
					});

					if (!response.ok) {
						throw new Error(`Failed to invite reviewer ${reviewerId} \n${hubId}, ${reviewerId}`);
					}
					return response.json();
				});

				await Promise.all(promises);
				toaster.success({
					title: 'Invitations sent',
					description: 'The selected users have been invited to be reviewers.'
				});
				await loadPendingInvites();
			} else {
				// Handle remove action
				const response = await fetch(`/hub/view/${hubId}/reviewers/remove`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ reviewers: userIds })
				});

				if (response.ok) {
					await loadReviewers();
					toaster.success({
						title: 'Reviewers removed',
						description: 'The reviewers have been removed successfully.'
					});
				}
			}
		} catch (error) {
			console.error(`Error ${action}ing reviewers:`, error);
			toaster.error({
				title: `Error ${action === 'invite' ? 'inviting' : 'removing'} reviewers`,
				description: `An error occurred while trying to ${action === 'invite' ? 'invite' : 'remove'} reviewers.`
			});
		} finally {
			loading = false;
			if (action === 'invite') {
				selectedUsers = [];
			}
		}
	}
</script>

{#if isCreator}
	<Modal
		open={openModal}
		onOpenChange={(e) => (openModal = e.open)}
		triggerBase="btn preset-filled"
		contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
	>
		{#snippet trigger()}
			<div class="flex items-center gap-2">
				<Icon icon="mdi:account-multiple" />
				Manage Reviewers
			</div>
		{/snippet}

		{#snippet content()}
			<header class="flex justify-between items-center border-b pb-2 mb-4">
				<h2 class="text-2xl font-semibold">Manage Reviewers</h2>
			</header>

			<!-- Search -->
			<div class="relative">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search users..."
					class="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-700 dark:text-white"
				/>
				<Icon
					icon="mdi:magnify"
					class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
				/>
			</div>

			<!-- Lista de usuários filtrados -->
			{#if filteredUsers.length > 0}
				<div class="max-h-64 overflow-y-auto space-y-3">
					{#each filteredUsers as user}
						<label
							class="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-surface-700 hover:bg-gray-100 dark:hover:bg-surface-600 rounded-lg cursor-pointer transition-colors"
						>
							<div class="flex items-center gap-4">
								<div
									class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-surface-500"
								>
									{#if user.profilePicture}
										<img
											src={user.profilePicture}
											alt={`${user.firstName}'s profile`}
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
										{user.firstName}
										{user.lastName}
									</div>
									<div class="text-sm text-gray-500">{user.email}</div>
								</div>
							</div>
							<input
								type="checkbox"
								class="form-checkbox h-5 w-5 text-primary-600"
								checked={selectedUsers.includes(user._id)}
								onchange={() => {
									if (selectedUsers.includes(user._id)) {
										selectedUsers = selectedUsers.filter((id) => id !== user._id);
									} else {
										selectedUsers = [...selectedUsers, user._id];
									}
								}}
							/>
						</label>
					{/each}
				</div>

				<!-- Botão de adicionar -->
				<div class="flex justify-end mt-4">
					<button
						class="btn preset-filled"
						onclick={() => manageReviewers('invite', selectedUsers)}
						disabled={selectedUsers.length === 0 || loading}
					>
						<Icon icon="mdi:email-send" class="mr-2" />
						Send Invitations
					</button>
				</div>
			{:else}
				<p class="text-center text-gray-500 dark:text-gray-400">No users found</p>
			{/if}

			<!-- Revisores atuais -->
			<div class="pt-4 border-t mt-4 space-y-2">
				<h3 class="font-medium text-lg">Current Reviewers</h3>
				{#if reviewers.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each reviewers as reviewer}
							<div class="chip variant-filled flex items-center">
								{reviewer.firstName}
								{reviewer.lastName}
								<button
									class="ml-2 text-red-500 hover:text-red-700"
									onclick={() => manageReviewers('remove', [reviewer._id])}
								>
									<Icon icon="mdi:close" />
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-center text-gray-500 dark:text-gray-400">No reviewers assigned yet</p>
				{/if}
			</div>

			<!-- Pending invites section -->
			{#if pendingInvites.length > 0}
				<div class="pt-4 border-t mt-4 space-y-2">
					<h3 class="font-medium text-lg">Pending Invitations</h3>
					<div class="flex flex-wrap gap-2">
						{#each pendingInvites as invite}
							<div class="chip variant-ghost flex items-center">
								{users.find((u: { _id: User }) => u._id === invite.reviewer)?.firstName}
								{users.find((u: { _id: User }) => u._id === invite.reviewer)?.lastName}
								<span class="ml-2 text-yellow-500">
									<Icon icon="mdi:clock-outline" />
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/snippet}
	</Modal>
{/if}
