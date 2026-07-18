<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DashboardTone } from './types';

	interface Props {
		label?: string;
		title?: string;
		description?: string;
		tone?: DashboardTone;
		placeholder?: boolean;
		compact?: boolean;
		class?: string;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		label,
		title,
		description,
		tone = 'slate',
		placeholder = false,
		compact = false,
		class: className = '',
		children,
		footer
	}: Props = $props();
</script>

<article
	class="flex h-full min-h-28 flex-col justify-between rounded-lg border border-surface-200/70 bg-surface-50/60 transition duration-150 hover:border-surface-300 hover:bg-white {compact
		? 'p-4 sm:p-5'
		: 'p-6'} {className}"
>
	{#if label}
		<p class="max-w-36 text-[11px] font-medium uppercase leading-4 tracking-wide text-surface-500">
			{label}
		</p>
	{/if}
	{#if title}
		<p class="mt-4 text-3xl font-semibold leading-none tracking-tight text-surface-950">{title}</p>
	{/if}
	{#if description}
		<p class="mt-2 text-sm leading-relaxed text-surface-500">{description}</p>
	{/if}
	{#if children}
		<div class="mt-4">{@render children()}</div>
	{/if}
	{#if footer}
		<div class="mt-auto pt-4">{@render footer()}</div>
	{/if}
</article>
