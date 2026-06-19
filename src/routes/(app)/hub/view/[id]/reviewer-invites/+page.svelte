<script lang="ts">
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'duplicate';

	let { data }: Props = $props();
	const { hub, invitations } = data;

	let loadingInviteId = $state<string | null>(null);
	let statusFilter = $state<StatusFilter>('all');
	let searchTerm = $state('');

	let pendingCount = $derived(invitations.filter((invite) => invite.status === 'pending').length);
	let duplicateCount = $derived(
		invitations.filter((invite) => invite.status === 'duplicate').length
	);
	let respondedCount = $derived(
		invitations.filter((invite) => invite.status === 'accepted' || invite.status === 'declined')
			.length
	);

	let filteredInvitations = $derived(
		invitations.filter((invite) => {
			const matchesStatus = statusFilter === 'all' || invite.status === statusFilter;
			if (!matchesStatus) return false;

			const term = searchTerm.trim().toLowerCase();
			if (!term) return true;

			return getSearchText(invite).includes(term);
		})
	);
	let paperGroups = $derived(buildPaperGroups(filteredInvitations));

	function filterButtonClass(filter: StatusFilter) {
		return statusFilter === filter
			? 'bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500'
			: 'bg-white text-surface-800 hover:bg-surface-100 dark:bg-surface-700 dark:text-surface-100 dark:hover:bg-surface-600';
	}

	function personName(user: any, fallback = 'Unknown user') {
		if (!user) return fallback;
		return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || fallback;
	}

	function editorName(invite: any) {
		return invite?.invitedBy?.name || personName(invite?.invitedBy?.user);
	}

	function reviewerName(invite: any) {
		return personName(invite?.reviewer, 'Unknown reviewer');
	}

	// function paperTitle(paper: any) {
	// 	return paper?.title || 'Unknown paper';
	// }
	function stripHtml(html: string) {
		if (!html) return '';

		return html.replace(/<[^>]*>/g, '');
	}

	function paperTitle(paper: any) {
		return stripHtml(paper?.title || 'Unknown paper');
	}

	function originalInvite(invite: any) {
		return invite?.duplicateOfInvitation || null;
	}

	function originalEditorName(invite: any) {
		const original = originalInvite(invite);
		if (!original?.invitedBy) return editorName(invite);
		return original.invitedBy.name || personName(original.invitedBy.user);
	}

	function originalEditorRole(invite: any) {
		const original = originalInvite(invite);
		return (
			original?.invitedBy?.role ||
			original?.invitedBy?.roleLabel ||
			invite?.invitedBy?.role ||
			'Member'
		);
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
				return 'bg-amber-50 text-amber-800 border-amber-200';
			case 'accepted':
				return 'bg-emerald-50 text-emerald-800 border-emerald-200';
			case 'declined':
				return 'bg-rose-50 text-rose-800 border-rose-200';
			case 'duplicate':
				return 'bg-slate-100 text-slate-700 border-slate-300';
			default:
				return 'bg-surface-100 text-surface-700 border-surface-200';
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

	function roleLabel(invite: any) {
		return invite?.invitedBy?.roleLabel || invite?.invitedBy?.role || 'Member';
	}

	function rawRole(invite: any) {
		return invite?.invitedBy?.role || roleLabel(invite);
	}

	function getSearchText(invite: any) {
		return [
			paperTitle(invite.paper),
			reviewerName(invite),
			editorName(invite),
			originalEditorName(invite),
			roleLabel(invite),
			invite.statusLabel,
			invite.status
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
	}

	function buildPaperGroups(list: any[]) {
		const groups = new Map<string, { key: string; title: string; invitations: any[] }>();

		for (const invite of list) {
			const title = paperTitle(invite.paper);
			const key = invite.paperId || title;
			const current = groups.get(key) || { key, title, invitations: [] as any[] };
			current.invitations.push(invite);
			groups.set(key, current);
		}

		return [...groups.values()].sort((left, right) => left.title.localeCompare(right.title));
	}

	async function cancelInvitation(inviteId: string) {
		if (!confirm('Cancel this invitation?')) {
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
				const result = await response.json();
				toaster.error({ title: 'Error', description: result.error });
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
	<div class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div>
			<a
				href="/hub/view/{hub._id || hub.id}"
				class="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"
			>
				<Icon icon="mdi:arrow-left" class="size-5" />
				Back to Hub
			</a>
			<h1 class="mt-3 text-3xl font-bold text-gray-950">Review Invitations Dashboard</h1>
			<p class="mt-1 text-sm text-gray-500">{hub.title}</p>
		</div>

		<div
			class="flex flex-wrap gap-2 rounded-xl border border-surface-300 bg-surface-50 p-1.5 dark:border-surface-600 dark:bg-surface-800"
		>
			<button
				type="button"
				class="btn btn-sm text-sm font-semibold {filterButtonClass('all')}"
				onclick={() => (statusFilter = 'all')}>All invitations</button
			>
			<button
				type="button"
				class="btn btn-sm text-sm font-semibold {filterButtonClass('pending')}"
				onclick={() => (statusFilter = 'pending')}>Pending</button
			>
			<button
				type="button"
				class="btn btn-sm text-sm font-semibold {filterButtonClass('accepted')}"
				onclick={() => (statusFilter = 'accepted')}>Accepted</button
			>
			<button
				type="button"
				class="btn btn-sm text-sm font-semibold {filterButtonClass('declined')}"
				onclick={() => (statusFilter = 'declined')}>Declined</button
			>
			<button
				type="button"
				class="btn btn-sm text-sm font-semibold {filterButtonClass('duplicate')}"
				onclick={() => (statusFilter = 'duplicate')}>Duplicate</button
			>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-3 md:grid-cols-4 mb-6">
		<div class="rounded-lg border border-surface-200 bg-white p-4">
			<div class="text-xs font-semibold uppercase text-gray-500">Total</div>
			<div class="mt-1 text-2xl font-bold text-gray-950">{invitations.length}</div>
		</div>
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
			<div class="text-xs font-semibold uppercase text-amber-700">Pending</div>
			<div class="mt-1 text-2xl font-bold text-amber-900">{pendingCount}</div>
		</div>
		<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
			<div class="text-xs font-semibold uppercase text-emerald-700">Responded</div>
			<div class="mt-1 text-2xl font-bold text-emerald-900">{respondedCount}</div>
		</div>
		<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
			<div class="text-xs font-semibold uppercase text-slate-600">Duplicate</div>
			<div class="mt-1 text-2xl font-bold text-slate-900">{duplicateCount}</div>
		</div>
	</div>

	<div class="mb-5 max-w-xl">
		<label for="invitation-search" class="sr-only">Search invitations</label>
		<div class="relative">
			<Icon
				icon="mdi:magnify"
				class="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
			/>
			<input
				id="invitation-search"
				type="search"
				bind:value={searchTerm}
				placeholder="Search paper, reviewer, or invited by"
				class="w-full rounded-lg border border-surface-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
			/>
		</div>
	</div>

	{#if paperGroups.length === 0}
		<div class="rounded-lg border border-surface-200 bg-white px-4 py-12 text-center text-gray-500">
			No invitations found.
		</div>
	{:else}
		<div class="space-y-5">
			{#each paperGroups as group}
				<section class="overflow-hidden rounded-lg border border-surface-200 bg-white">
					<div class="border-b border-surface-200 bg-surface-50 px-4 py-4">
						<div class="text-xs font-semibold uppercase text-gray-500">Paper</div>
						<h2 class="mt-1 text-lg font-semibold text-gray-950">{group.title}</h2>
					</div>

					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-surface-200 text-sm">
							<thead class="bg-white text-left text-xs font-semibold uppercase text-gray-500">
								<tr>
									<th class="px-4 py-3">Reviewer name</th>
									<th class="px-4 py-3">Editor name</th>
									<th class="px-4 py-3">Role badge</th>
									<th class="px-4 py-3">Status badge</th>
									<th class="px-4 py-3">Date</th>
									<th class="px-4 py-3 text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-surface-100">
								{#each group.invitations as invite (invite._id || invite.id)}
									<tr class="align-top hover:bg-surface-50">
										<td class="px-4 py-3">
											<div class="font-medium text-gray-950">{reviewerName(invite)}</div>
											{#if invite.status === 'duplicate'}
												<div
													class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
												>
													<div class="font-semibold text-slate-900">
														Duplicate invitation attempt
													</div>
													<div class="mt-1">
														Reviewer already invited by:
														<span class="font-medium">{originalEditorName(invite)}</span>
													</div>
													<div class="mt-1">
														<span
															class="inline-flex items-center rounded-full border px-2 py-0.5 font-semibold {roleClass(
																originalEditorRole(invite)
															)}"
														>
															{originalInvite(invite)?.invitedBy?.roleLabel ||
																originalInvite(invite)?.invitedBy?.role ||
																roleLabel(invite)}
														</span>
													</div>
												</div>
											{/if}
										</td>
										<td class="px-4 py-3 text-gray-800">{editorName(invite)}</td>
										<td class="px-4 py-3">
											<span
												class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold {roleClass(
													rawRole(invite)
												)}"
											>
												{roleLabel(invite)}
											</span>
										</td>
										<td class="px-4 py-3">
											<span
												class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold {statusClass(
													invite.status
												)}"
											>
												{invite.statusLabel}
											</span>
										</td>
										<td class="px-4 py-3 text-gray-600"
											>{formatDate(invite.createdAt || invite.invitedAt)}</td
										>
										<td class="px-4 py-3">
											<div class="flex justify-end gap-2">
												{#if invite.paperId}
													<a href="/publish/view/{invite.paperId}" class="btn btn-sm preset-tonal">
														<Icon icon="mdi:book-open-page-variant" class="size-4" />
														View
													</a>
												{/if}
												{#if invite.status === 'pending'}
													<button
														class="btn btn-sm preset-filled-error-500"
														disabled={loadingInviteId === (invite._id || invite.id)}
														onclick={() => cancelInvitation(invite._id || invite.id)}
													>
														{#if loadingInviteId === (invite._id || invite.id)}
															<Icon icon="eos-icons:loading" class="size-4" />
															Cancelling
														{:else}
															<Icon icon="mdi:close" class="size-4" />
															Cancel
														{/if}
													</button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
