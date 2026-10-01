<script lang="ts">
	import AdminFilters from '$lib/components/Admin/AdminFilters.svelte';
	import AdminTable from '$lib/components/Admin/AdminTable.svelte';
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import { formatAdminDate, truncate } from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const columns = [
		'Paper',
		'Recipient',
		'Sender',
		'Hub',
		'Type',
		'Status',
		'Sent',
		'Expires'
	] as const;
</script>

<svelte:head>
	<title>Invitations | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">Invitations</h2>
		<p class="mt-1 text-sm text-slate-600">
			Reviewer invitations across every paper. Invitation tokens are never selected or displayed, so
			this screen cannot be used to accept an invitation on someone's behalf.
		</p>
	</div>

	<AdminFilters
		search={data.invitations.search}
		placeholder="Paper title, DOI or person"
		statuses={data.statuses}
		selectedStatus={data.status}
		statusLabel="Invitation status"
	/>

	<AdminTable
		{columns}
		items={data.invitations.items}
		page={data.invitations.page}
		pageCount={data.invitations.pageCount}
		total={data.invitations.total}
		pageSize={data.invitations.pageSize}
		emptyTitle="No invitations found"
		emptyMessage="No invitation matches these filters."
	>
		{#snippet row(invitation)}
			<td class="px-4 py-3">
				<a
					href={`/publish/view/${invitation.paperId}`}
					class="font-medium text-primary-700 hover:text-primary-800"
				>
					{truncate(invitation.paperTitle ?? invitation.paperId, 44)}
				</a>
			</td>
			<td class="px-4 py-3">
				<p class="text-slate-700">{invitation.recipient ?? '—'}</p>
				{#if invitation.recipientEmail}
					<p class="truncate text-xs text-slate-500">{invitation.recipientEmail}</p>
				{/if}
			</td>
			<td class="px-4 py-3 text-slate-600">{invitation.sender ?? '—'}</td>
			<td class="px-4 py-3 text-slate-600">
				{#if invitation.hubId}
					<a href={`/hub/view/${invitation.hubId}`} class="text-primary-700 hover:text-primary-800">
						{truncate(invitation.hubTitle ?? invitation.hubId, 22)}
					</a>
				{:else}
					<span class="text-xs text-slate-500">No hub</span>
				{/if}
			</td>
			<td class="px-4 py-3 text-xs text-slate-600">{invitation.type}</td>
			<td class="px-4 py-3">
				<StatusBadge status={invitation.status} />
				{#if invitation.resendCount > 0}
					<p class="mt-1 text-xs text-slate-500">Resent {invitation.resendCount}×</p>
				{/if}
			</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminDate(invitation.invitedAt)}
			</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminDate(invitation.expiresAt)}
			</td>
		{/snippet}
	</AdminTable>
</section>
