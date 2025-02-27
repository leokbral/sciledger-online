<script lang="ts">
	import { TabGroup, TabAnchor } from '@skeletonlabs/skeleton';

	export let data: any;
	const items = data.items;
	export let pathname: string;

	let tabContainer: HTMLDivElement;

	let isInEnd: boolean = false;
	const scrollToEnd = () => {
		if (tabContainer) {
			const lastTab = tabContainer.lastElementChild;
			if (lastTab) {
				lastTab.scrollIntoView({ behavior: 'smooth', block: 'end' });
			}
		}
		isInEnd = true;
	};

	const scrollToStart = () => {
		if (tabContainer) {
			const firstTab = tabContainer.firstElementChild;
			if (firstTab) {
				firstTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
		isInEnd = false;
	};

	$: lastPathitem = pathname.split('/').pop();
</script>

<!-- <button on:click={scrollToNextTab}>Rolar para Próxima Tab</button> -->
<div class="grid grid-cols-[1fr_auto]">
	<TabGroup class="grid grid-cols-[1] gap-0 items-center p-0">
		<div bind:this={tabContainer} class="tab-container flex">
			{#each items as item, i}
				<TabAnchor
					href="./{item.name}"
					selected={lastPathitem === item.name}
					class="text-3xl tab-anchor !px-3.5"
					id={`tabAnchor-${i}`}
				>
					{item.icon}
				</TabAnchor>
			{/each}
		</div>
	</TabGroup>
	{#if isInEnd}
		<button
			type="button"
			class="m-auto btn-icon variant-filled-white md:hidden"
			on:click={scrollToStart}
			><span class="flex pb-2 align-center justify-center text-4xl"> « </span>
		</button>
	{:else}
		<button
			type="button"
			class="m-auto btn-icon variant-filled-white md:hidden"
			on:click={scrollToEnd}
		>
			<span class="flex pb-2 align-center justify-center text-4xl"> » </span>
		</button>
	{/if}
</div>
