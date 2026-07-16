<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Uppercase field label. */
		label: string;
		/** Plain-text value, rendered when no custom body is provided. */
		value?: string | number | null;
		/** Render the field as a bordered mini panel. */
		boxed?: boolean;
		/** Additional classes for layout tweaks. */
		class?: string;
		/** Optional custom body (e.g. a badge) rendered in place of the value. */
		children?: Snippet;
	}

	let { label, value, boxed = false, class: className = '', children }: Props = $props();
</script>

<div class="space-y-1 {boxed ? 'rounded-md border p-3' : ''} {className}">
	<p class="text-xs uppercase tracking-wide opacity-70">{label}</p>
	{#if children}
		{@render children()}
	{:else if value !== undefined && value !== null}
		<p class="text-sm font-medium">{value}</p>
	{/if}
</div>
