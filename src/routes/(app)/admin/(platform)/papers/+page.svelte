<script lang="ts">
	import AdminFilters from '$lib/components/Admin/AdminFilters.svelte';
	import AdminTable from '$lib/components/Admin/AdminTable.svelte';
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import { formatAdminDate, truncate } from '$lib/helpers/adminFormat';
	import { statusLabel } from '$lib/helpers/statusLabels';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const columns = ['Paper', 'Author', 'Hub', 'Status', 'DOI', 'Submitted'] as const;
</script>

<svelte:head>
	<title>Papers | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">Papers</h2>
		<p class="mt-1 text-sm text-slate-600">
			Search by title or DOI and filter by editorial status. Open a paper through the existing
			interface to see its full record.
		</p>
	</div>

	<AdminFilters
		search={data.papers.search}
		placeholder="Paper title or DOI"
		statuses={data.statuses}
		selectedStatus={data.status}
		statusLabel="Editorial status"
	/>

	<AdminTable
		{columns}
		items={data.papers.items}
		page={data.papers.page}
		pageCount={data.papers.pageCount}
		total={data.papers.total}
		pageSize={data.papers.pageSize}
		emptyTitle="No papers found"
		emptyMessage="No paper matches these filters."
	>
		{#snippet row(paper)}
			<td class="px-4 py-3">
				<a
					href={`/publish/view/${paper.id}`}
					class="font-medium text-primary-700 hover:text-primary-800"
				>
					{truncate(paper.title, 56)}
				</a>
				<p class="break-all font-mono text-xs text-slate-500">{paper.id}</p>
			</td>
			<td class="px-4 py-3">
				{#if paper.authorId}
					<a
						href={`/admin/users/${paper.authorId}`}
						class="text-primary-700 hover:text-primary-800"
					>
						{paper.author ?? paper.authorId}
					</a>
				{:else}
					<span class="text-xs text-slate-400">—</span>
				{/if}
			</td>
			<td class="px-4 py-3">
				{#if paper.hubId}
					<a href={`/hub/view/${paper.hubId}`} class="text-primary-700 hover:text-primary-800">
						{truncate(paper.hubTitle ?? paper.hubId, 28)}
					</a>
				{:else}
					<span class="text-xs text-slate-500">No hub</span>
				{/if}
			</td>
			<td class="px-4 py-3">
				<StatusBadge status={paper.status} override={paper.declined ? 'declined' : null} />
				{#if paper.declined && paper.status !== 'rejected'}
					<!--
						The hub flag and the status column disagree on this row. Showing the stored
						status keeps the inconsistency visible instead of smoothing it over.
					-->
					<p class="mt-1 text-xs text-amber-700">
						stored status: {statusLabel(paper.status)}
					</p>
				{/if}
				{#if paper.declined && paper.declinedAt}
					<p class="mt-1 text-xs text-slate-500">{formatAdminDate(paper.declinedAt)}</p>
				{/if}
			</td>
			<td class="px-4 py-3 font-mono text-xs text-slate-600">{paper.doi ?? '—'}</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">{formatAdminDate(paper.createdAt)}</td>
		{/snippet}
	</AdminTable>
</section>
