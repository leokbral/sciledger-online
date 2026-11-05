<script lang="ts">
	import { AppBar } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<div>
	<header>
		<AppBar>
			{#snippet lead()}
				<strong class="text-xl uppercase">Skeleton</strong>
			{/snippet}
			{#snippet trail()}
				<a
					class="btn btn-sm preset-tonal-surface border border-surface-500"
					href="https://discord.gg/EXqV7W8MtY"
					target="_blank"
					rel="noreferrer"
				>
					Discord
				</a>
				<a
					class="btn btn-sm preset-tonal-surface border border-surface-500"
					href="https://twitter.com/SkeletonUI"
					target="_blank"
					rel="noreferrer"
				>
					Twitter
				</a>
				<a
					class="btn btn-sm preset-tonal-surface border border-surface-500"
					href="https://github.com/skeletonlabs/skeleton"
					target="_blank"
					rel="noreferrer"
				>
					GitHub
				</a>
			{/snippet}
		</AppBar>
	</header>
	{@render children?.()}
</div>
