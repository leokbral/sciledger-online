<script lang="ts">
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import { onMount } from 'svelte';
	import type { Invitation } from '$lib/types/Invitation';

	let invitations = $state<Invitation[]>([]);
	let loading = $state(true);

	async function loadInvitations() {
		try {
			const response = await fetch('/api/my-paper-review-invitations');
			const data = await response.json();
			if (response.ok) {
				invitations = data.invitations;
			}
		} catch (error) {
			console.error('Error loading invitations:', error);
		} finally {
			loading = false;
		}
	}

	async function respondToInvitation(invitationId: string, accept: boolean) {
		try {
			const response = await fetch('/api/paper-reviewer-invitations/accept', {
				method: accept ? 'POST' : 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invitationId })
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success(accept ? 'Invitation accepted!' : 'Invitation declined');
				// Remover da lista
				invitations = invitations.filter((inv) => inv.id !== invitationId);
			} else {
				toaster.error(data.error || 'Failed to respond to invitation');
			}
		} catch (error) {
			console.error('Error responding to invitation:', error);
			toaster.error('An error occurred');
		}
	}

	onMount(() => {
		loadInvitations();
	});
</script>

{#if loading}
	<div class="flex items-center gap-2 text-surface-600">
		<Icon icon="eos-icons:loading" class="size-5" />
		Loading invitations...
	</div>
{:else if invitations.length > 0}
	<div class="space-y-4">
		<h3 class="text-xl font-bold flex items-center gap-2">
			<Icon icon="mdi:email-open" class="size-6" />
			Paper Review Invitations ({invitations.length})
		</h3>

		{#each invitations as invitation}
			<div class="card p-4 bg-primary-50 border-l-4 border-primary-500">
				<div class="flex justify-between items-start mb-3">
					<div class="flex-1">
						<h4 class="font-semibold text-lg">
							{invitation.paper?.title || 'Untitled Paper'}
						</h4>
						{#if invitation.hubId}
							<p class="text-sm text-surface-600 flex items-center gap-1">
								<Icon icon="mdi:hub" class="size-4" />
								Hub: {invitation.hubId.title || 'Unknown Hub'}
							</p>
						{/if}
						<p class="text-sm text-surface-600 mt-1">
							Invited by: {invitation.invitedBy?.firstName} {invitation.invitedBy?.lastName}
						</p>
						<p class="text-xs text-surface-500">
							{new Date(invitation.invitedAt).toLocaleDateString()}
						</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						class="btn preset-filled-success flex items-center gap-2"
						onclick={() => respondToInvitation(invitation.id, true)}
					>
						<Icon icon="mdi:check" class="size-5" />
						Accept
					</button>
					<button
						class="btn preset-filled-error flex items-center gap-2"
						onclick={() => respondToInvitation(invitation.id, false)}
					>
						<Icon icon="mdi:close" class="size-5" />
						Decline
					</button>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<p class="text-surface-600">No pending review invitations</p>
{/if}
