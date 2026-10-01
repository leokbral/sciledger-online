<script lang="ts">
	interface Props {
		label: string;
		value: number | string;
		hint?: string;
	}

	let { label, value, hint }: Props = $props();

	let formatted = $derived(typeof value === 'number' ? value.toLocaleString('en-US') : value);
</script>

<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
	<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
	<p class="mt-2 text-3xl font-semibold text-slate-950">{formatted}</p>
	{#if hint}
		<p class="mt-1 text-xs text-slate-500">{hint}</p>
	{/if}
</div>
