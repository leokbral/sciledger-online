<script lang="ts">
	// Aliased: `statusLabel` is already a prop of this component (the field's caption).
	import { statusLabel as formatStatus } from '$lib/helpers/statusLabels';

	interface Props {
		/** Current search term, echoed back into the input. */
		search?: string;
		placeholder?: string;
		/** Optional status filter. When omitted, only the search box renders. */
		statuses?: readonly string[];
		selectedStatus?: string;
		statusLabel?: string;
		/** Page size to carry across submissions. */
		pageSize?: number;
	}

	let {
		search = '',
		placeholder = 'Search',
		statuses,
		selectedStatus = '',
		statusLabel = 'Status',
		pageSize
	}: Props = $props();
</script>

<!--
	A plain GET form: filters live in the URL, so an administrator can bookmark and
	share a filtered view, and `readPagination` on the server is the single parser.
	Submitting always returns to page 1.
-->
<form
	method="GET"
	class="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
>
	<label class="flex-1 space-y-1" style="min-width: 16rem;">
		<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
		<input
			type="search"
			name="q"
			value={search}
			{placeholder}
			class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none"
		/>
	</label>

	{#if statuses && statuses.length > 0}
		<label class="space-y-1">
			<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{statusLabel}</span
			>
			<select
				name="status"
				class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none"
			>
				<option value="" selected={!selectedStatus}>All</option>
				{#each statuses as status}
					<!-- The stored value stays in `value`; only the text the person reads is translated. -->
					<option value={status} selected={selectedStatus === status}>{formatStatus(status)}</option
					>
				{/each}
			</select>
		</label>
	{/if}

	{#if pageSize}
		<input type="hidden" name="pageSize" value={pageSize} />
	{/if}

	<button type="submit" class="btn preset-filled-primary-500">Apply</button>
</form>
