<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const { hub, invitations, reviewers } = data;

	let expandedInvites = $state<string[]>([]);
	let loadingInviteId = $state<string | null>(null);

	function toggleExpanded(inviteId: string) {
		if (expandedInvites.includes(inviteId)) {
			expandedInvites = expandedInvites.filter((id) => id !== inviteId);
		} else {
			expandedInvites = [...expandedInvites, inviteId];
		}
	}

	async function cancelInvitation(inviteId: string) {
		if (!confirm('Are you sure you want to cancel this invitation?')) {
			return;
		}

		loadingInviteId = inviteId;
		try {
			const response = await fetch(`/api/paper-reviewer-invitations/${inviteId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				toaster.success({ title: 'Invitation cancelled' });
				window.location.reload();
			} else {
				const data = await response.json();
				toaster.error({ title: 'Error', description: data.error });
			}
		} catch (error) {
			console.error('Error cancelling invitation:', error);
			toaster.error({ title: 'Error', description: 'Failed to cancel invitation' });
		} finally {
			loadingInviteId = null;
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center gap-3 mb-4">
				<a href="/hub/view/{hub._id || hub.id}" class="text-primary-600 hover:text-primary-700 flex items-center gap-2">
					<Icon icon="mdi:arrow-left" class="size-5" />
					Back to Hub
				</a>
			</div>
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white">Pending Reviewer Invitations</h1>
			<p class="text-gray-600 dark:text-gray-400 mt-2">Manage paper review invitations for {hub.title}</p>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
				<div class="text-sm text-gray-600 dark:text-gray-400">Pending Invitations</div>
				<div class="text-3xl font-bold text-primary-600">{invitations.length}</div>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
				<div class="text-sm text-gray-600 dark:text-gray-400">Hub Reviewers</div>
				<div class="text-3xl font-bold text-blue-600">{reviewers.length}</div>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
				<div class="text-sm text-gray-600 dark:text-gray-400">Response Rate</div>
				<div class="text-3xl font-bold text-green-600">
					{invitations.length > 0 ? '0%' : '-'}
				</div>
			</div>
		</div>

		<!-- Invitations List -->
		{#if invitations.length === 0}
			<div class="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
				<Icon icon="mdi:inbox-multiple" class="size-16 text-gray-400 mx-auto mb-4" />
				<h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No pending invitations</h2>
				<p class="text-gray-600 dark:text-gray-400">All invitations have been responded to or there are none yet.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each invitations as invite (invite._id || invite.id)}
					<div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<!-- Header -->
						<div
							class="p-6 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
							onclick={() => toggleExpanded(invite._id || invite.id)}
						>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-2">
									<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
										{invite.paper ? (typeof invite.paper === 'object' ? invite.paper.title : 'Unknown Paper') : 'Unknown Paper'}
									</h3>
									<span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-medium">
										Pending Response
									</span>
								</div>
								<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
									<div class="flex items-center gap-1">
										<Icon icon="mdi:account" class="size-4" />
										{typeof invite.reviewer === 'object'
											? `${invite.reviewer.firstName} ${invite.reviewer.lastName}`
											: 'Unknown Reviewer'}
									</div>
									<div class="flex items-center gap-1">
										<Icon icon="mdi:calendar" class="size-4" />
										{new Date(invite.invitedAt).toLocaleDateString()}
									</div>
								</div>
							</div>
							<div class="flex-shrink-0">
								<Icon
									icon={expandedInvites.includes(invite._id || invite.id) ? 'mdi:chevron-up' : 'mdi:chevron-down'}
									class="size-6 text-gray-400"
								/>
							</div>
						</div>

						<!-- Expanded Content -->
						{#if expandedInvites.includes(invite._id || invite.id)}
							<div class="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 space-y-4">
								<!-- Paper Details -->
								{#if typeof invite.paper === 'object' && invite.paper}
									<div>
										<h4 class="font-semibold text-gray-900 dark:text-white mb-2">Paper Details</h4>
										<div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
											{#if invite.paper.abstract}
												<p>
													<span class="font-medium">Abstract:</span>
													<span class="line-clamp-3">{invite.paper.abstract}</span>
												</p>
											{/if}
											{#if invite.paper.keywords}
												<p>
													<span class="font-medium">Keywords:</span>
													<span>{invite.paper.keywords?.join(', ') || '-'}</span>
												</p>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Reviewer Details -->
								{#if typeof invite.reviewer === 'object' && invite.reviewer}
									<div>
										<h4 class="font-semibold text-gray-900 dark:text-white mb-2">Reviewer Details</h4>
										<div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
											<p>
												<span class="font-medium">Email:</span>
												<span>{invite.reviewer.email}</span>
											</p>
											{#if invite.reviewer.institution}
												<p>
													<span class="font-medium">Institution:</span>
													<span>{invite.reviewer.institution}</span>
												</p>
											{/if}
										</div>
									</div>
								{/if}

								<!-- Invitation Details -->
								<div>
									<h4 class="font-semibold text-gray-900 dark:text-white mb-2">Invitation Details</h4>
									<div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
										<p>
											<span class="font-medium">Status:</span>
											<span class="text-yellow-600 dark:text-yellow-400">Pending Response</span>
										</p>
										<p>
											<span class="font-medium">Invited At:</span>
											<span>{new Date(invite.invitedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
										</p>
										{#if invite.customDeadlineDays}
											<p>
												<span class="font-medium">Deadline:</span>
												<span>{invite.customDeadlineDays} days</span>
											</p>
										{/if}
									</div>
								</div>

								<!-- Actions -->
								<div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
									<button
										class="btn btn-sm preset-outlined"
										onclick={() => {
											const paperId = typeof invite.paper === 'object' ? invite.paper.id : invite.paper;
											window.location.href = `/review/paperspool/${paperId}`;
										}}
									>
										<Icon icon="mdi:book-open-page-variant" class="size-4 mr-1" />
										View Paper
									</button>
									<button
										class="btn btn-sm preset-filled-error-500"
										disabled={loadingInviteId === (invite._id || invite.id)}
										onclick={() => cancelInvitation(invite._id || invite.id)}
									>
										{#if loadingInviteId === (invite._id || invite.id)}
											<Icon icon="eos-icons:loading" class="size-4 mr-1" />
										{:else}
											<Icon icon="mdi:delete" class="size-4 mr-1" />
										{/if}
										Cancel Invitation
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		--color-surface-900: #1e293b;
		--color-surface-800: #334155;
		--color-surface-700: #475569;
		--color-surface-600: #64748b;
		--color-surface-500: #78909c;
	}
</style>
