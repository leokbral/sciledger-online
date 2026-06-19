<script lang="ts">
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import { onMount } from 'svelte';

	let { reviewerInvitations = [] } = $props();
	let invitations = $state<any[]>(reviewerInvitations || []);
	let loading = $state(true);
	let respondingId = $state<string | null>(null);

	function paperTitle(invitation: any) {
		return invitation?.paper?.title || 'Untitled paper';
	}

	function invitedByName(invitation: any) {
		return invitation?.invitedBy?.name || 'Unknown user';
	}

	function invitationRole(invitation: any) {
		return invitation?.invitedBy?.roleLabel || invitation?.invitedBy?.role || 'Member';
	}

	function invitationRawRole(invitation: any) {
		return invitation?.invitedBy?.role || invitationRole(invitation);
	}

	function formatDate(value: string | null | undefined) {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '-';
		return date.toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function statusClass(status: string) {
		switch (status) {
			case 'pending':
				return 'border-amber-200 bg-amber-50 text-amber-800';
			case 'accepted':
				return 'border-emerald-200 bg-emerald-50 text-emerald-800';
			case 'declined':
				return 'border-rose-200 bg-rose-50 text-rose-800';
			default:
				return 'border-surface-200 bg-surface-50 text-surface-700';
		}
	}

	function roleClass(role: string | null | undefined) {
		switch (role) {
			case 'HubOwner':
				return 'border-yellow-300 bg-yellow-50 text-yellow-900';
			case 'EditorChief':
				return 'border-slate-300 bg-slate-100 text-slate-800';
			case 'AssociateEditor':
				return 'border-orange-300 bg-orange-50 text-orange-900';
			case 'Reviewer':
				return 'border-blue-200 bg-blue-50 text-blue-900';
			default:
				return 'border-surface-200 bg-surface-50 text-surface-700';
		}
	}

	async function loadInvitations() {
		try {
			const response = await fetch('/api/my-paper-review-invitations');
			const data = await response.json();
			if (response.ok) {
				invitations = data.invitations || [];
			}
		} catch (error) {
			console.error('Error loading invitations:', error);
		} finally {
			loading = false;
		}
	}

	async function respondToInvitation(invitationId: string, action: 'accept' | 'decline') {
		respondingId = invitationId;
		try {
			const response = await fetch(`/api/paper-reviewer-invitations/${invitationId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});

			const data = await response.json();
			if (response.ok) {
				toaster.success({
					title: action === 'accept' ? 'Invitation accepted' : 'Invitation declined'
				});
				invitations = invitations.map((invitation) =>
					(invitation.id || invitation._id) === invitationId
						? {
								...invitation,
								status: action === 'accept' ? 'accepted' : 'declined',
								statusLabel: action === 'accept' ? 'Accepted' : 'Declined'
							}
						: invitation
				);
			} else {
				toaster.error({ title: 'Error', description: data.error || 'Failed to respond' });
			}
		} catch (error) {
			console.error('Error responding to invitation:', error);
			toaster.error({ title: 'Error', description: 'An error occurred' });
		} finally {
			respondingId = null;
		}
	}

	onMount(() => {
		if (invitations.length > 0) {
			loading = false;
			return;
		}
		loadInvitations();
	});
</script>

<section class="mb-6 overflow-hidden rounded-lg border border-surface-200 bg-white">
	<div class="flex items-center justify-between border-b border-surface-200 px-4 py-3">
		<h2 class="text-lg font-semibold text-gray-950">My Review Invitations</h2>
		<span class="text-sm font-medium text-gray-500">{invitations.length}</span>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
			<Icon icon="eos-icons:loading" class="size-5" />
			Loading invitations...
		</div>
	{:else if invitations.length === 0}
		<div class="px-4 py-6 text-sm text-gray-500">No review invitations.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-surface-200 text-sm">
				<thead class="bg-surface-50 text-left text-xs font-semibold uppercase text-gray-500">
					<tr>
						<th class="px-4 py-3">Paper</th>
						<th class="px-4 py-3">Invited by</th>
						<th class="px-4 py-3">Role</th>
						<th class="px-4 py-3">Date</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-100">
					{#each invitations as invitation (invitation.id || invitation._id)}
						<tr>
							<td class="px-4 py-3 font-medium text-gray-950">{paperTitle(invitation)}</td>
							<td class="px-4 py-3 text-gray-700">{invitedByName(invitation)}</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold {roleClass(invitationRawRole(invitation))}">
									{invitationRole(invitation)}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-600">
								{formatDate(invitation.createdAt || invitation.invitedAt)}
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold {statusClass(invitation.status)}">
									{invitation.statusLabel || invitation.status}
								</span>
							</td>
							<td class="px-4 py-3">
								{#if invitation.status === 'pending'}
									<div class="flex justify-end gap-2">
										<button
											class="btn btn-sm preset-filled-success-500"
											disabled={respondingId === (invitation.id || invitation._id)}
											onclick={() => respondToInvitation(invitation.id || invitation._id, 'accept')}
										>
											<Icon icon="mdi:check" class="size-4" />
											Accept
										</button>
										<button
											class="btn btn-sm preset-filled-error-500"
											disabled={respondingId === (invitation.id || invitation._id)}
											onclick={() => respondToInvitation(invitation.id || invitation._id, 'decline')}
										>
											<Icon icon="mdi:close" class="size-4" />
											Decline
										</button>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
