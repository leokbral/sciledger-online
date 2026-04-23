<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { User } from '$lib/types/User';
	import type { ReviewQueue } from '$lib/types/ReviewQueue';

	// Props
	const { hubId, canManageHub, canInviteVice, assistantManagerIds, users }: {
		hubId: string;
		canManageHub: boolean;
		canInviteVice: boolean;
		assistantManagerIds: string[];
		users: any[];
	} = $props();

	// State
	let reviewers = $state<typeof users>([]);
	let selectedUsers = $state<string[]>([]);
	let openModal = $state(false);
	let loading = $state(false);
	let searchTerm = $state('');
	let filteredUsers = $state<typeof users>([]);
	let pendingInvites = $state<ReviewQueue[]>([]);
	let activeTab = $state(0);
	let emailInvite = $state('');
	let memberSearch = $state('');
	let memberRoleFilter = $state<'all' | 'vice' | 'reviewer'>('all');
	let memberPage = $state(1);
	const MEMBERS_PER_PAGE = 12;

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
	async function manageReviewers(action: 'invite' | 'remove', userIds: string[], role: 'reviewer' | 'vice_manager' = 'reviewer') {
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
							reviewerId,
							role
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
					description: role === 'vice_manager'
						? 'The selected users have been invited to be Editor-in-chief.'
						: 'The selected users have been invited to be reviewers.'
				});
				await loadPendingInvites();
			} else {
				// Handle remove action
				const response = await fetch(`/hub/view/${hubId}/reviewers`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ reviewers: userIds, action: 'remove' })
				});

				if (response.ok) {
					const data = await response.json();
					await loadReviewers();
					toaster.success({
						title: 'Reviewers removed',
						description: 'The reviewers have been removed successfully.'
					});

					if (data?.removedCurrentUserAsVice || (Array.isArray(data?.removedViceManagers) && data.removedViceManagers.length > 0)) {
						window.location.reload();
					}
				}
			}
		} catch (error) {
			console.error(`Error ${action}ing reviewers:`, error);
			toaster.error({
				title: `Error ${action === 'invite' ? 'inviting' : 'removing'} users`,
				description: `An error occurred while trying to ${action === 'invite' ? 'invite' : 'remove'} users.`
			});
		} finally {
			loading = false;
			if (action === 'invite') {
				selectedUsers = [];
			}
		}
	}

	function confirmReviewerRemoval(reviewerId: string, reviewerName: string) {
		const shouldRemove = confirm(
			`Are you sure you want to remove ${reviewerName} as reviewer? This action can be reverted by inviting them again.`
		);

		if (!shouldRemove) return;

		manageReviewers('remove', [reviewerId]);
	}

	function isViceManager(userId: string): boolean {
		return assistantManagerIds.includes(userId);
	}

	function getViceReviewers() {
		return reviewers.filter((reviewer: any) => isViceManager(reviewer._id));
	}

	function getRegularReviewers() {
		return reviewers.filter((reviewer: any) => !isViceManager(reviewer._id));
	}

	function getUserAvatar(user: any): string {
		return user?.profilePictureUrl || user?.profilePicture || '';
	}

	function getManagedMembers() {
		return reviewers
			.map((reviewer: any) => {
				const firstName = reviewer.firstName || '';
				const lastName = reviewer.lastName || '';
				const fullName = `${firstName} ${lastName}`.trim() || reviewer.email || 'Unknown user';
				return {
					id: reviewer._id,
					fullName,
					email: reviewer.email || '',
					avatarUrl: getUserAvatar(reviewer),
					role: isViceManager(reviewer._id) ? 'vice' : 'reviewer'
				};
			})
			.sort((a, b) => a.fullName.localeCompare(b.fullName));
	}

	function initialsFromName(name: string): string {
		const parts = name.split(' ');
		let initials = '';
		for (const part of parts) {
			if (!part) continue;
			initials += part[0];
			if (initials.length >= 2) break;
		}
		return initials.toUpperCase();
	}

	function getFilteredManagedMembers() {
		const term = memberSearch.trim().toLowerCase();
		return getManagedMembers().filter((member) => {
			const roleMatch = memberRoleFilter === 'all' || member.role === memberRoleFilter;
			if (!roleMatch) return false;
			if (!term) return true;
			return member.fullName.toLowerCase().includes(term) || member.email.toLowerCase().includes(term);
		});
	}

	function getTotalPages() {
		const total = getFilteredManagedMembers().length;
		return Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE));
	}

	function getVisibleMembers() {
		const list = getFilteredManagedMembers();
		const start = (memberPage - 1) * MEMBERS_PER_PAGE;
		return list.slice(start, start + MEMBERS_PER_PAGE);
	}

	$effect(() => {
		memberSearch;
		memberRoleFilter;
		reviewers;
		memberPage = 1;
	});

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

{#if canManageHub}
	<Modal
		open={openModal}
		onOpenChange={(e) => (openModal = e.open)}
		triggerBase="btn inline-flex items-center gap-2 rounded-full border border-surface-300 dark:border-surface-600 bg-white/95 dark:bg-surface-800 px-4 py-2 text-surface-800 dark:text-surface-100 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
		contentBase="card bg-white dark:bg-surface-800 p-4 sm:p-6 shadow-2xl rounded-lg max-w-4xl w-full sm:w-[92vw] max-h-[90vh] overflow-hidden flex flex-col"
	>
		{#snippet trigger()}
			<div class="flex items-center gap-2">
				<Icon icon="mdi:account-group" width="20" />
				Manage Members
			</div>
		{/snippet}

		{#snippet content()}
			<header class="flex-shrink-0 flex justify-between items-center border-b pb-2 mb-4">
				<h2 class="text-2xl font-semibold">Manage Hub Members</h2>
			</header>

			<div class="flex-1 overflow-y-auto pr-1 space-y-4">

			<!-- Tab Navigation -->
			<div class="flex gap-2 mb-4">
				<button
					class="btn {activeTab === 0 ? 'preset-filled' : 'preset-outlined'}"
					onclick={() => (activeTab = 0)}
				>
					<Icon icon="mdi:account-multiple" class="size-5" />
					Registered Users
				</button>
				<button
					class="btn {activeTab === 1 ? 'preset-filled' : 'preset-outlined'}"
					onclick={() => (activeTab = 1)}
				>
					<Icon icon="mdi:email-plus" class="size-5" />
					Invite by Email
				</button>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 0}
						<!-- Registered Users Tab -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 mb-3">
							<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
								<div class="flex items-center gap-2 mb-1 text-blue-900 font-semibold">
									<Icon icon="mdi:account-check" />
									Reviewer
								</div>
								<p class="text-xs text-blue-800">Can review papers and receive review assignments.</p>
							</div>
							{#if canInviteVice}
								<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
									<div class="flex items-center gap-2 mb-1 text-amber-900 font-semibold">
										<Icon icon="mdi:shield-account" />
										Editor-in-chief
									</div>
									<p class="text-xs text-amber-800">Can manage hub workflows, but cannot make final publication decisions.</p>
								</div>
							{/if}
						</div>

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

						<!-- Selected counter -->
						<div class="flex items-center justify-between mt-3 mb-1 text-sm text-gray-600 dark:text-gray-300">
							<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200 font-semibold">
								<Icon icon="mdi:account-multiple" class="size-4" />
								Selected: {selectedUsers.length}
							</span>
							<span class="text-xs text-gray-500 dark:text-gray-400">Choose one action below to send invitations.</span>
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
												{#if user.profilePictureUrl || user.profilePicture}
													<img
														src={user.profilePictureUrl || user.profilePicture}
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

							<!-- Ações de convite separadas -->
							<div class="flex flex-wrap justify-end gap-2 mt-4">
								<button
									class="btn preset-filled-primary-500"
									onclick={() => manageReviewers('invite', selectedUsers, 'reviewer')}
									disabled={selectedUsers.length === 0 || loading}
								>
									<Icon icon="mdi:account-check" class="mr-2" />
									Invite as Reviewers ({selectedUsers.length})
								</button>
								{#if canInviteVice}
								<button
										class="btn bg-amber-600 hover:bg-amber-700 text-white"
										onclick={() => manageReviewers('invite', selectedUsers, 'vice_manager')}
									disabled={selectedUsers.length === 0 || loading}
								>
										<Icon icon="mdi:shield-account" class="mr-2" />
										Invite as Editor-in-chief ({selectedUsers.length})
								</button>
								{/if}
							</div>
						{:else}
							<p class="text-center text-gray-500 dark:text-gray-400">No users found</p>
						{/if}

					{:else}
						<!-- Email Invite Tab -->
						<div class="space-y-4 mt-4">
							<div class="bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 p-4 rounded">
								<div class="flex items-start gap-3">
									<Icon icon="mdi:information" class="size-6 text-primary-500 flex-shrink-0 mt-0.5" />
									<div>
										<p class="font-semibold text-primary-900 dark:text-primary-100 mb-1">Invite a Reviewer by Email</p>
										<p class="text-sm text-primary-700 dark:text-primary-300">
											Send an invitation to someone who doesn't have an account yet. They will receive an email with a registration link to join the platform as a reviewer for this hub.
										</p>
									</div>
								</div>
							</div>

							<div>
								<label for="email-invite" class="label mb-2">
									<span class="text-gray-700 dark:text-gray-300">Email Address <span class="text-error-500">*</span></span>
								</label>
								<input
									type="email"
									id="email-invite"
									bind:value={emailInvite}
									placeholder="reviewer@university.edu"
									class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-700 dark:text-white dark:border-surface-600"
									disabled={loading}
								/>
								<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
									The reviewer will receive an invitation email with a registration link
								</p>
							</div>

							<div class="flex justify-end">
								<button
									class="btn preset-filled"
									onclick={sendEmailInvitation}
									disabled={loading || !emailInvite.trim()}
								>
									{#if loading}
										<Icon icon="eos-icons:loading" class="size-5" />
										Sending...
									{:else}
										<Icon icon="mdi:email-send" class="mr-2" />
										Send Email Invitation
									{/if}
								</button>
							</div>
						</div>
					{/if}

			<!-- Revisores atuais -->
			<div class="pt-4 border-t mt-4 space-y-2">
				<h3 class="font-medium text-lg">Current Reviewers</h3>
				{#if reviewers.length > 0}
					<div class="rounded-xl border border-surface-200 dark:border-surface-700 p-3 space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="text-sm text-gray-600 dark:text-gray-300">
								Total: <strong>{reviewers.length}</strong>
								<span class="ml-2 text-amber-700">Vice: {getViceReviewers().length}</span>
								<span class="ml-2 text-blue-700">Reviewer: {getRegularReviewers().length}</span>
							</div>
							<div class="flex items-center gap-2">
								<button class="btn btn-xs {memberRoleFilter === 'all' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberRoleFilter = 'all')}>All</button>
								<button class="btn btn-xs {memberRoleFilter === 'vice' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberRoleFilter = 'vice')}>Vice</button>
								<button class="btn btn-xs {memberRoleFilter === 'reviewer' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberRoleFilter = 'reviewer')}>Reviewer</button>
							</div>
						</div>

						<div class="relative">
							<input
								type="text"
								bind:value={memberSearch}
								placeholder="Search current members by name or email..."
								class="w-full p-2.5 pl-9 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-700 dark:text-white"
							/>
							<Icon icon="mdi:magnify" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
						</div>

						<div class="max-h-72 overflow-auto rounded-lg border border-surface-200 dark:border-surface-700">
							<div class="grid grid-cols-[1.6fr_1.2fr_auto] gap-2 px-3 py-2 text-xs font-semibold text-gray-500 bg-surface-50 dark:bg-surface-800 sticky top-0">
								<div>Member</div>
								<div>Role</div>
								<div>Action</div>
							</div>
							{#if getVisibleMembers().length > 0}
								{#each getVisibleMembers() as member}
									<div class="grid grid-cols-[1.6fr_1.2fr_auto] gap-2 px-3 py-2.5 border-t border-surface-200 dark:border-surface-700 items-center">
										<div class="min-w-0">
											<div class="flex items-center gap-2 min-w-0">
												{#if member.avatarUrl}
													<img src={member.avatarUrl} alt={member.fullName} class="w-7 h-7 rounded-full object-cover" />
												{:else}
													<div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
														{initialsFromName(member.fullName)}
													</div>
												{/if}
												<div class="min-w-0">
													<div class="text-sm font-medium text-gray-900 dark:text-white truncate">{member.fullName}</div>
													<div class="text-xs text-gray-500 truncate">{member.email || 'No email'}</div>
												</div>
											</div>
										</div>
										<div>
											{#if member.role === 'vice'}
												<span class="inline-flex rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Editor-in-chief</span>
											{:else}
												<span class="inline-flex rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Reviewer</span>
											{/if}
										</div>
										<div>
											<button class="btn btn-xs preset-filled-error-500" onclick={() => confirmReviewerRemoval(member.id, member.fullName)}>
												Remove
											</button>
										</div>
									</div>
								{/each}
							{:else}
								<div class="px-3 py-6 text-sm text-center text-gray-500">No members found for this filter.</div>
							{/if}
						</div>

						{#if getFilteredManagedMembers().length > MEMBERS_PER_PAGE}
							<div class="flex items-center justify-between text-xs text-gray-600">
								<span>Page {memberPage} of {getTotalPages()} ({getFilteredManagedMembers().length} results)</span>
								<div class="flex items-center gap-1">
									<button class="btn btn-xs preset-outlined" onclick={() => (memberPage = Math.max(1, memberPage - 1))} disabled={memberPage <= 1}>Prev</button>
									<button class="btn btn-xs preset-outlined" onclick={() => (memberPage = Math.min(getTotalPages(), memberPage + 1))} disabled={memberPage >= getTotalPages()}>Next</button>
								</div>
							</div>
						{/if}
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
								{#if (invite as any).role === 'vice_manager'}
									<span class="ml-2 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
										Vice
									</span>
								{:else if (invite as any).role === 'reviewer'}
									<span class="ml-2 rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
										Reviewer
									</span>
								{/if}
								<span class="ml-2 text-yellow-500">
									<Icon icon="mdi:clock-outline" />
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			</div>
		{/snippet}
	</Modal>
{/if}
