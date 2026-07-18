<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		class?: string;
		action?: Snippet;
		children?: Snippet;
	}

	let { title, description, class: className = '', action, children }: Props = $props();
</script>

<section class="space-y-4 {className}">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="space-y-1">
			<h2 class="text-lg font-semibold text-surface-950">{title}</h2>
			{#if description}
				<p class="max-w-3xl text-sm leading-relaxed text-surface-600">{description}</p>
			{/if}
		</div>
		{#if action}
			<div class="shrink-0">
				{@render action()}
			</div>
		{/if}
	</div>

	{@render children?.()}
</section>
