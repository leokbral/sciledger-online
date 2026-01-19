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
		reviewSlots?: Array<{
			slotNumber: number;
			reviewerId: string | null;
			status: 'available' | 'pending' | 'occupied' | 'declined';
		}>;
		mainAuthorId?: string;
		coAuthorIds?: string[];
		submittedById?: string;
	}

	let { paperId, hubId, hubReviewers, currentAssignedReviewers, reviewSlots = [], mainAuthorId, coAuthorIds = [], submittedById }: Props = $props();

	let openModal = $state(false);
	let selectedReviewers = $state<string[]>([]);
	let loading = $state(false);
	let activeTab = $state<'hub' | 'email'>('hub');
	let emailInvite = $state('');
	let customDeadlineDays = $state(15); // Prazo padrão de 15 dias

	// Calcular slots disponíveis
	let availableSlotsCount = $derived(
		reviewSlots.filter(slot => slot.status === 'available' || slot.status === 'declined').length
	);
	let occupiedSlotsCount = $derived(
		reviewSlots.filter(slot => slot.status === 'occupied').length
	);
	let maxSlots = $derived(reviewSlots.length || 3);

	// Filtrar revisores que ainda não foram convidados para este paper
	// Também excluir autores, co-autores e quem submeteu o paper
	let availableReviewers = $derived(
		hubReviewers.filter(
			(reviewer) => {
				const reviewerId = reviewer.id || reviewer._id;
				// Verificar se já foi convidado
				if (currentAssignedReviewers.includes(reviewerId)) {
					return false;
				}
				// Excluir autor principal
				if (mainAuthorId && mainAuthorId === reviewerId) {
					return false;
				}
				// Excluir co-autores
				if (coAuthorIds && coAuthorIds.includes(reviewerId)) {
					return false;
				}
				// Excluir submitter
				if (submittedById && submittedById === reviewerId) {
					return false;
				}
				return true;
			}
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
					reviewerIds: selectedReviewers,
					customDeadlineDays // Enviar o prazo customizado
				})
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success({ 
					title: `Invited ${data.invitations} reviewer(s)!`, 
					description: data.message
				});
				selectedReviewers = [];
				customDeadlineDays = 15; // Resetar para o padrão
				openModal = false;
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

			<!-- Slots Status Display -->
			<div class="mb-6 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
				<div class="flex items-center justify-between mb-3">
					<h4 class="font-semibold text-surface-900 dark:text-surface-100">Review Slots Status</h4>
					<span class="text-sm text-surface-600 dark:text-surface-400">
						{occupiedSlotsCount} / {maxSlots} occupied
					</span>
				</div>
				
				<div class="flex gap-3 mb-2">
					{#each Array(maxSlots) as _, i}
						{@const slot = reviewSlots[i]}
						<div class="flex-1 h-12 rounded-lg border-2 flex items-center justify-center font-semibold text-sm
							{slot?.status === 'occupied' ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-200' : 
							 slot?.status === 'pending' ? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : 
							 'bg-surface-100 border-surface-300 text-surface-500 dark:bg-surface-700 dark:border-surface-600'}">
							{#if slot?.status === 'occupied'}
								<Icon icon="mdi:check-circle" class="size-5 mr-1" />
								Slot {i + 1}
							{:else if slot?.status === 'pending'}
								<Icon icon="mdi:clock-outline" class="size-5 mr-1" />
								Slot {i + 1}
							{:else}
								<Icon icon="mdi:checkbox-blank-circle-outline" class="size-5 mr-1" />
								Slot {i + 1}
							{/if}
						</div>
					{/each}
				</div>
				
				<div class="flex gap-4 text-xs text-surface-600 dark:text-surface-400 mb-2">
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-surface-300"></div>
						Available
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
						Pending
					</div>
					<div class="flex items-center gap-1">
						<div class="w-3 h-3 rounded-full bg-green-500"></div>
						Occupied
					</div>
				</div>

				<div class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
					💡 You can invite as many reviewers as you want. The first {maxSlots} to accept will occupy the review slots.
				</div>
			</div>

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
							<div class="flex items-center justify-between mb-4 text-surface-600">
								<p>Select reviewers from your hub to invite them to review this paper:</p>
								<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
									<Icon icon="mdi:account-multiple" class="size-4" />
									Selected: {selectedReviewers.length}
								</span>
							</div>

							<!-- Campo de prazo customizado -->
							<div class="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
								<label class="block mb-2">
									<span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Review Deadline (days)</span>
									<p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
										Set the number of days reviewers will have to complete the review after accepting
									</p>
									<div class="flex items-center gap-3">
										<input
											type="number"
											bind:value={customDeadlineDays}
											min="1"
											max="90"
											class="input w-32 text-center"
											placeholder="15"
										/>
										<span class="text-sm text-gray-600 dark:text-gray-400">
											days from acceptance
										</span>
									</div>
								</label>
							</div>

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
