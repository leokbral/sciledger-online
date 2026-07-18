<script lang="ts">
	import type { HubWorkspaceNavItem } from './hubTypes';

	interface Props {
		items?: HubWorkspaceNavItem[];
	}

	let { items = [] }: Props = $props();

	function handleAction(item: HubWorkspaceNavItem) {
		if (item.action === 'members') {
			window.dispatchEvent(new CustomEvent('hub-members-requested'));
		}
	}
</script>

{#if items.length > 0}
	<nav
		class="sticky top-0 z-10 overflow-x-auto border-b border-surface-200/80 bg-white/90 backdrop-blur"
		aria-label="Hub workspace navigation"
	>
		<div class="flex min-w-max items-center gap-7 px-0.5">
			{#each items as item (item.label)}
				{#if item.action}
					<button
						type="button"
						class="inline-flex border-b-2 px-0.5 py-3.5 text-[13px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 {item.active
							? 'border-surface-950 text-surface-950'
							: 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-950'}"
						onclick={() => handleAction(item)}
					>
						{item.label}
					</button>
				{:else if item.href}
					<a
						href={item.href}
						class="inline-flex border-b-2 px-0.5 py-3.5 text-[13px] font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 {item.active
							? 'border-surface-950 text-surface-950'
							: 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-950'}"
						data-sveltekit-preload-data
					>
						{item.label}
					</a>
				{/if}
			{/each}
		</div>
	</nav>
{/if}
