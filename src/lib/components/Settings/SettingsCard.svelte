<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Optional section heading. */
		title?: string;
		/** Optional supporting text rendered under the heading. */
		description?: string;
		/** Render the card with the destructive "danger zone" styling. */
		danger?: boolean;
		/** Additional classes for one-off layout needs, such as modals. */
		class?: string;
		/** Card body. */
		children?: Snippet;
	}

	let { title, description, danger = false, class: className = '', children }: Props = $props();
</script>

<section
	class="card space-y-4 rounded-lg p-5 {danger
		? 'border-2 border-red-300 dark:border-red-900'
		: 'border'} {className}"
>
	{#if title || description}
		<header class="space-y-1">
			{#if title}
				<h2 class="text-lg font-semibold {danger ? 'text-red-700 dark:text-red-400' : ''}">
					{title}
				</h2>
			{/if}
			{#if description}
				<p class="text-sm text-surface-600-400">{description}</p>
			{/if}
		</header>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</section>
