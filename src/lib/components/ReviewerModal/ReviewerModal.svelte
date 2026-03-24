<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import { page } from '$app/stores';

	import type { User } from '$lib/types/User';

	export let paperId: string;
	export let users: User[] = [];
	export let assignedReviewers: string[] = [];
	export let onReviewerChange: (newReviewers: string[]) => void;

	let openModal = false;
	let selectedUsers: string[] = [];
	let searchTerm = '';
	let filteredUsers: User[] = [];

	$: filterUsers();

	function filterUsers() {
		const currentUserId = $page.data.user?.id || $page.data.user?._id;

		filteredUsers = users.filter(user => {
			const name = `${user.firstName} ${user.lastName}`.toLowerCase();
			const reviewerId = user._id || user.id;
			const isCurrentUser = !!currentUserId && reviewerId === currentUserId;
			return (
				name.includes(searchTerm.toLowerCase()) &&
				!assignedReviewers.includes(reviewerId) &&
				!isCurrentUser
			);
		});
	}

	async function assignReviewers() {
		try {
			const uniqueSelection = [...new Set(selectedUsers)].filter(Boolean);

			const response = await fetch('/api/review/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paperId,
					reviewerIds: uniqueSelection,
					peerReviewType: 'selected'
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.message || result.error || 'Error assigning reviewers');
			}

			toaster.success({
				title: 'Reviewers Assigned',
				description: 'The reviewers have been successfully added to the paper.'
			});

			onReviewerChange([...new Set([...assignedReviewers, ...uniqueSelection])]);
			selectedUsers = [];
			openModal = false;
		} catch (err) {
			console.error(err);
			toaster.error({
				title: 'Error Assigning Reviewers',
				description: err instanceof Error ? err.message : 'Failed to add reviewers.'
			});
		}
	}
</script>

<Modal
	open={openModal}
	onOpenChange={(e) => (openModal = e.open)}
	triggerBase="btn preset-filled"
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
>
	{#snippet trigger()}
		<div class="flex items-center gap-2">
			<Icon icon="mdi:account-multiple-plus" />
			Manage Article Reviewers
		</div>
	{/snippet}

	{#snippet content()}
		<h2 class="text-xl font-semibold mb-4">Select Reviewers</h2>

		<!-- Campo de busca -->
		<input
			type="text"
			class="w-full p-3 mb-3 border rounded-lg"
			placeholder="Search user..."
			bind:value={searchTerm}
		/>

		<!-- Lista de usuários -->
		{#if filteredUsers.length > 0}
			<div class="max-h-64 overflow-y-auto space-y-2">
				{#each filteredUsers as user}
					<label class="flex items-center justify-between bg-gray-50 p-3 rounded hover:bg-gray-100 dark:bg-surface-700 dark:hover:bg-surface-600">
						<div>
							<p class="font-medium">{user.firstName} {user.lastName}</p>
							<p class="text-sm text-gray-500">{user.email}</p>
						</div>
						<input
							type="checkbox"
							checked={selectedUsers.includes(user._id)}
							on:change={() => {
								if (selectedUsers.includes(user._id)) {
									selectedUsers = selectedUsers.filter(id => id !== user._id);
								} else {
									selectedUsers = [...selectedUsers, user._id];
								}
							}}
						/>
					</label>
				{/each}
			</div>
		{:else}
			<p class="text-gray-500 text-center">No user found</p>
		{/if}

		<!-- Assign button -->
		<div class="flex justify-end mt-4">
			<button
				class="btn preset-filled"
				on:click={assignReviewers}
				disabled={selectedUsers.length === 0}
			>
				<Icon icon="mdi:check" class="mr-2" />
				Assign Reviewers
			</button>
		</div>
	{/snippet}
</Modal>
