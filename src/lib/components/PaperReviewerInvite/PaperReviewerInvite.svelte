<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { User } from '$lib/types/User';

	interface Props {
		paperId: string;
		hubId: string;
		hubReviewers: User[];
		currentAssignedReviewers: string[];
	}

	let { paperId, hubId, hubReviewers, currentAssignedReviewers }: Props = $props();

	let openModal = $state(false);
	let selectedReviewers = $state<string[]>([]);
	let loading = $state(false);

	// Filtrar revisores que ainda não foram convidados para este paper
	let availableReviewers = $derived(
		hubReviewers.filter(
			(reviewer) => !currentAssignedReviewers.includes(reviewer.id || reviewer._id)
		)
	);

	async function sendInvitations() {
		if (selectedReviewers.length === 0) {
			toaster.warning('Select at least one reviewer');
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/paper-reviewer-invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paperId,
					hubId,
					reviewerIds: selectedReviewers
				})
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success(`Invited ${selectedReviewers.length} reviewer(s) successfully!`);
				selectedReviewers = [];
				openModal = false;
			} else {
				toaster.error(data.error || 'Failed to send invitations');
			}
		} catch (error) {
			console.error('Error sending invitations:', error);
			toaster.error('An error occurred while sending invitations');
		} finally {
			loading = false;
		}
	}

	function toggleReviewer(reviewerId: string) {
		if (selectedReviewers.includes(reviewerId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}
</script>

<button
	class="btn preset-filled-primary-500"
	onclick={() => (openModal = true)}
>
	<Icon icon="mdi:account-plus" class="size-5" />
	Invite Reviewers
</button>

<Modal bind:open={openModal}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<div class="p-6">
			<h3 class="text-2xl font-bold mb-4">Invite Hub Reviewers to Review Paper</h3>

			{#if availableReviewers.length === 0}
				<p class="text-surface-600 mb-4">
					All hub reviewers have already been invited to review this paper.
				</p>
			{:else}
				<p class="text-surface-600 mb-4">
					Select reviewers from your hub to invite them to review this paper:
				</p>

				<div class="space-y-2 mb-6 max-h-96 overflow-y-auto">
					{#each availableReviewers as reviewer}
						<label class="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-100 cursor-pointer">
							<input
								type="checkbox"
								checked={selectedReviewers.includes(reviewer.id || reviewer._id)}
								onchange={() => toggleReviewer(reviewer.id || reviewer._id)}
								class="checkbox"
							/>
							<div class="flex items-center gap-3">
								{#if reviewer.profilePictureUrl}
									<img
										src={reviewer.profilePictureUrl}
										alt={reviewer.firstName}
										class="w-10 h-10 rounded-full"
									/>
								{:else}
									<div class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
										{reviewer.firstName[0]}{reviewer.lastName[0]}
									</div>
								{/if}
								<div>
									<p class="font-semibold">
										{reviewer.firstName}
										{reviewer.lastName}
									</p>
									<p class="text-sm text-surface-600">{reviewer.email}</p>
								</div>
							</div>
						</label>
					{/each}
				</div>

				<div class="flex justify-end gap-3">
					<button class="btn preset-outlined" onclick={() => (openModal = false)}>
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
