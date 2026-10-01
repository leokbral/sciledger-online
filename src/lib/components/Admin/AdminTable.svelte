<script lang="ts">
	import type { Snippet } from 'svelte';
	import AdminPagination from './AdminPagination.svelte';

	interface Props {
		columns: readonly string[];
		items: any[];
		/** Rendered once per item; must emit the `<td>` cells for that row. */
		row: Snippet<[any]>;
		emptyTitle?: string;
		emptyMessage?: string;
		/** Pagination metadata. Omit to render the table without a footer. */
		page?: number;
		pageCount?: number;
		total?: number;
		pageSize?: number;
	}

	let {
		columns,
		items,
		row,
		emptyTitle = 'Nothing here yet',
		emptyMessage = 'No records match the current filters.',
		page,
		pageCount,
		total,
		pageSize
	}: Props = $props();

	let showPagination = $derived(
		page !== undefined && pageCount !== undefined && total !== undefined && pageSize !== undefined
	);
</script>

<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
	{#if items.length === 0}
		<div class="px-6 py-12 text-center">
			<p class="text-base font-semibold text-slate-900">{emptyTitle}</p>
			<p class="mt-1 text-sm text-slate-600">{emptyMessage}</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-slate-200 bg-slate-50">
					<tr>
						{#each columns as column}
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								{column}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each items as item}
						<tr class="align-top hover:bg-slate-50">
							{@render row(item)}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if showPagination}
		<AdminPagination
			page={page as number}
			pageCount={pageCount as number}
			total={total as number}
			pageSize={pageSize as number}
		/>
	{/if}
</div>
