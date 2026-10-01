<script lang="ts">
	import { page as appPage } from '$app/state';

	interface Props {
		page: number;
		pageCount: number;
		total: number;
		pageSize: number;
	}

	let { page, pageCount, total, pageSize }: Props = $props();

	/** Preserves every current query parameter and swaps only `page`. */
	function hrefForPage(target: number) {
		const params = new URLSearchParams(appPage.url.searchParams);
		params.set('page', String(target));
		return `${appPage.url.pathname}?${params.toString()}`;
	}

	let first = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	let last = $derived(Math.min(page * pageSize, total));
	let hasPrevious = $derived(page > 1);
	let hasNext = $derived(page < pageCount);
</script>

<div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
	<p class="text-sm text-slate-600">
		{#if total === 0}
			No records
		{:else}
			Showing <span class="font-medium text-slate-900">{first}</span>–<span
				class="font-medium text-slate-900">{last}</span
			>
			of <span class="font-medium text-slate-900">{total.toLocaleString('en-US')}</span>
		{/if}
	</p>

	<div class="flex items-center gap-2">
		{#if hasPrevious}
			<a href={hrefForPage(page - 1)} class="btn preset-outlined">Previous</a>
		{:else}
			<span class="btn preset-outlined pointer-events-none opacity-40" aria-disabled="true"
				>Previous</span
			>
		{/if}

		<span class="text-sm text-slate-600">Page {page} of {pageCount}</span>

		{#if hasNext}
			<a href={hrefForPage(page + 1)} class="btn preset-outlined">Next</a>
		{:else}
			<span class="btn preset-outlined pointer-events-none opacity-40" aria-disabled="true"
				>Next</span
			>
		{/if}
	</div>
</div>
