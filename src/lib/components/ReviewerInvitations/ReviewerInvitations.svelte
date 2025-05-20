<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';

	// Initialize with props
	let { reviewerInvitations } = $props();
	let invitations = $state(reviewerInvitations || []);
	let loading = $state(false);

	// Debug log to check initial data
	console.log('Initial reviewerInvitations:', reviewerInvitations);

	// Update local state when props change
	$effect(() => {
		console.log('Props updated:', reviewerInvitations);
		if (reviewerInvitations && reviewerInvitations.length > 0) {
			invitations = reviewerInvitations;
		}
	});

	async function loadInvitations() {
		if (invitations.length > 0) {
			return; // Skip loading if we already have invitations from props
		}

		loading = true;
		try {
			const response = await fetch('/api/reviewer-invitations');
			if (!response.ok) {
				throw new Error('Failed to fetch invitations');
			}
			const data = await response.json();
			invitations = data.reviewerInvitations || [];
			console.log('Loaded invitations:', invitations);
		} catch (error) {
			console.error('Error loading invitations:', error);
			toaster.error({
				title: 'Error',
				description: 'Failed to load invitations'
			});
		} finally {
			loading = false;
		}
	}

	async function handleInvitation(inviteId: string, action: 'accept' | 'reject') {
		loading = true;
		try {
			const response = await fetch(`/api/reviewer-invitations/${inviteId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});

			if (response.ok) {
				invitations = invitations.filter((invite: { _id: string; }) => invite._id !== inviteId);
				toaster.success({
					title: `Invitation ${action}ed`,
					description: `You have successfully ${action}ed the invitation.`
				});
			} else {
				throw new Error('Failed to process invitation');
			}
		} catch (error) {
			console.error(`Error ${action}ing invitation:`, error);
			toaster.error({
				title: 'Error',
				description: `Failed to ${action} invitation`
			});
		} finally {
			loading = false;
		}
	}

	onMount(loadInvitations);
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Reviewer Invitations</h2>
	<div class="space-y-2">
		{#if loading}
			<div class="card p-4">
				<p class="text-sm text-gray-500">Loading invitations...</p>
			</div>
		{:else if invitations.length === 0}
			<p class="text-sm text-gray-400">No reviewer invitations at the moment.</p>
		{:else}
			{#each invitations as invite (invite._id)}
				<div class="card p-4 flex items-center justify-between">
					<div>
						<p class="font-medium">Invitation to review hub</p>
						<p class="text-sm text-gray-500">
							Received {new Date(invite.createdAt).toLocaleDateString()}
						</p>
					</div>
					<div class="flex gap-2">
						<button
							class="btn preset-filled-success-500"
							disabled={loading}
							onclick={() => handleInvitation(invite._id, 'accept')}
						>
							<Icon icon="mdi:check" class="mr-2" />
							Accept
						</button>
						<button
							class="btn preset-filled-error-500"
							disabled={loading}
							onclick={() => handleInvitation(invite._id, 'reject')}
						>
							<Icon icon="mdi:close" class="mr-2" />
							Reject
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
