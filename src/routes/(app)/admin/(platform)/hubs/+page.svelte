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
		'Hub',
		'Type',
		'Owner',
		'Members',
		'Reviewers',
		'Papers',
		'Status',
		'Created'
	] as const;
</script>

<svelte:head>
	<title>Hubs | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">Hubs</h2>
		<p class="mt-1 text-sm text-slate-600">
			Global view across every hub. Hub permissions are unchanged: this screen does not grant
			editorial rights inside a hub.
		</p>
	</div>

	<AdminFilters search={data.hubs.search} placeholder="Hub title, type or ISSN" />

	<AdminTable
		{columns}
		items={data.hubs.items}
		page={data.hubs.page}
		pageCount={data.hubs.pageCount}
		total={data.hubs.total}
		pageSize={data.hubs.pageSize}
		emptyTitle="No hubs found"
		emptyMessage="No hub matches this search."
	>
		{#snippet row(hub)}
			<td class="px-4 py-3">
				<a href={`/hub/view/${hub.id}`} class="font-medium text-primary-700 hover:text-primary-800">
					{truncate(hub.title, 48)}
				</a>
				<p class="break-all font-mono text-xs text-slate-500">{hub.slug}</p>
			</td>
			<td class="px-4 py-3 text-slate-600">{hub.type ?? '—'}</td>
			<td class="px-4 py-3">
				{#if hub.ownerId}
					<a href={`/admin/users/${hub.ownerId}`} class="text-primary-700 hover:text-primary-800">
						{hub.owner ?? hub.ownerId}
					</a>
				{:else}
					<span class="text-xs text-slate-400">—</span>
				{/if}
			</td>
			<td class="px-4 py-3 text-slate-600">{hub.memberCount}</td>
			<td class="px-4 py-3 text-slate-600">{hub.reviewerCount}</td>
			<td class="px-4 py-3 text-slate-600">{hub.paperCount}</td>
			<td class="px-4 py-3"><StatusBadge status={hub.status} /></td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">{formatAdminDate(hub.createdAt)}</td>
		{/snippet}
	</AdminTable>
</section>
