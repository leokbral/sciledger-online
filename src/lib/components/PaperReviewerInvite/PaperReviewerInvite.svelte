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
	let activeTab = $state<'hub' | 'email'>('hub');
	let emailInvite = $state('');

	// Filtrar revisores que ainda não foram convidados para este paper
	let availableReviewers = $derived(
		hubReviewers.filter(
			(reviewer) => !currentAssignedReviewers.includes(reviewer.id || reviewer._id)
		)
	);

	async function sendInvitations() {
		if (selectedReviewers.length === 0) {
			toaster.warning({ title: 'Select at least one reviewer' });
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
				toaster.success({ title: `Invited ${selectedReviewers.length} reviewer(s) successfully!`, description: 'They will receive a notification.' });
				selectedReviewers = [];
				openModal = false;
				// Atualizar a lista de revisores convidados
				currentAssignedReviewers = [...currentAssignedReviewers, ...selectedReviewers];
				// Reload the page to update the list
				window.location.reload();
			} else {
				toaster.error({ title: 'Error', description: data.error || 'Failed to send invitations' });
			}
		} catch (error) {
			console.error('Error sending invitations:', error);
			toaster.error({ title: 'Error', description: 'An error occurred while sending invitations' });
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

	async function sendEmailInvitation() {
		if (!emailInvite.trim()) {
			toaster.warning({ title: 'Please enter an email address' });
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(emailInvite)) {
			toaster.error({ title: 'Invalid email', description: 'Please enter a valid email address' });
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/email-reviewer-invitation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: emailInvite,
					hubId
				})
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success({ title: 'Invitation sent!', description: 'The reviewer will receive an email with registration instructions.' });
				emailInvite = '';
				openModal = false;
			} else {
				toaster.error({ title: 'Error', description: data.error || 'Failed to send invitation' });
			}
		} catch (error) {
			console.error('Error sending email invitation:', error);
			toaster.error({ title: 'Error', description: 'An error occurred while sending the invitation' });
		} finally {
			loading = false;
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

<Modal open={openModal} onOpenChange={(e) => (openModal = e.open)}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<div class="p-6">
			<h3 class="text-2xl font-bold mb-4">Invite Reviewers to Review Paper</h3>

			<!-- Custom Tab Navigation -->
			<div class="flex border-b border-surface-300 mb-6">
				<button
					class="px-4 py-2 flex items-center gap-2 transition-colors {activeTab === 'hub'
						? 'border-b-2 border-primary-500 text-primary-500 font-semibold'
						: 'text-surface-600 hover:text-surface-900'}"
					onclick={() => (activeTab = 'hub')}
				>
					<Icon icon="mdi:account-group" class="size-5" />
					Hub Reviewers
				</button>
				<button
					class="px-4 py-2 flex items-center gap-2 transition-colors {activeTab === 'email'
						? 'border-b-2 border-primary-500 text-primary-500 font-semibold'
						: 'text-surface-600 hover:text-surface-900'}"
					onclick={() => (activeTab = 'email')}
				>
					<Icon icon="mdi:email-plus" class="size-5" />
					Invite by Email
				</button>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'hub'}
						<!-- Hub Reviewers Tab -->
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

					{:else}
						<!-- Email Invite Tab -->
						<div class="space-y-4">
							<div class="bg-primary-50 border-l-4 border-primary-500 p-4 rounded">
								<div class="flex items-start gap-3">
									<Icon icon="mdi:information" class="size-6 text-primary-500 flex-shrink-0 mt-0.5" />
									<div>
										<p class="font-semibold text-primary-900 mb-1">Invite a Reviewer by Email</p>
										<p class="text-sm text-primary-700">
											Send an invitation to someone who doesn't have an account yet. They will receive an email with a registration link to join the platform as a reviewer for this hub.
										</p>
									</div>
								</div>
							</div>

							<div>
								<label for="email-invite" class="label mb-2">
									<span>Email Address <span class="text-error-500">*</span></span>
								</label>
								<input
									type="email"
									id="email-invite"
									bind:value={emailInvite}
									placeholder="reviewer@university.edu"
									class="input"
									disabled={loading}
								/>
								<p class="text-xs text-surface-500 mt-1">
									The reviewer will receive an invitation email with a registration link
								</p>
							</div>

							<div class="flex justify-end gap-3">
								<button class="btn preset-outlined" onclick={() => (openModal = false)}>
									Cancel
								</button>
								<button
									class="btn preset-filled-primary-500"
									onclick={sendEmailInvitation}
									disabled={loading || !emailInvite.trim()}
								>
									{#if loading}
										<Icon icon="eos-icons:loading" class="size-5" />
										Sending...
									{:else}
										<Icon icon="mdi:email-send" class="size-5" />
										Send Email Invitation
									{/if}
								</button>
							</div>
						</div>
					{/if}
		</div>
	{/snippet}
</Modal>
