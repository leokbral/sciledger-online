<script lang="ts">
	import AdminFilters from '$lib/components/Admin/AdminFilters.svelte';
	import AdminTable from '$lib/components/Admin/AdminTable.svelte';
	import { formatAdminDateTime, truncate } from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const columns = ['Action', 'Actor', 'Resource', 'Result', 'When'] as const;
</script>

<svelte:head>
	<title>Activity | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold text-slate-900">Activity and audit</h2>
			<p class="mt-1 text-sm text-slate-600">
				{#if data.adminOnly}
					Administrative events only. Each row records the acting administrator, the action and the
					resource.
				{:else}
					Every activity event on the platform, administrative and editorial.
				{/if}
			</p>
		</div>

		<div class="flex gap-2">
			<a
				href="/admin/activity"
				class="rounded-lg border px-3 py-2 text-sm font-medium transition {data.adminOnly
					? 'border-primary-500 bg-primary-500 text-white'
					: 'border-slate-200 bg-white text-slate-700 hover:border-primary-400'}"
			>
				Administrative
			</a>
			<a
				href="/admin/activity?scope=all"
				class="rounded-lg border px-3 py-2 text-sm font-medium transition {data.adminOnly
					? 'border-slate-200 bg-white text-slate-700 hover:border-primary-400'
					: 'border-primary-500 bg-primary-500 text-white'}"
			>
				All events
			</a>
		</div>
	</div>

	<AdminFilters search={data.activity.search} placeholder="Action, resource type or resource id" />

	<AdminTable
		{columns}
		items={data.activity.items}
		page={data.activity.page}
		pageCount={data.activity.pageCount}
		total={data.activity.total}
		pageSize={data.activity.pageSize}
		emptyTitle="No events recorded"
		emptyMessage="No activity event matches these filters."
	>
		{#snippet row(event)}
			<td class="px-4 py-3 font-mono text-xs text-slate-700">{event.action}</td>
			<td class="px-4 py-3">
				{#if event.actorId}
					<a href={`/admin/users/${event.actorId}`} class="text-primary-700 hover:text-primary-800">
						{event.actor ?? event.actorId}
					</a>
				{:else}
					<span class="text-xs text-slate-500">System</span>
				{/if}
			</td>
			<td class="px-4 py-3 text-slate-600">
				{event.resourceType}
				<span class="text-slate-400">·</span>
				<span class="break-all font-mono text-xs">{truncate(event.resourceId, 28)}</span>
			</td>
			<td class="px-4 py-3 text-xs text-slate-600">{event.result ?? '—'}</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminDateTime(event.createdAt)}
			</td>
		{/snippet}
	</AdminTable>
</section>
