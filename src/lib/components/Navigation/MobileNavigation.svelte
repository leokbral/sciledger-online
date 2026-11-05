<script lang="ts">
	interface Props {
		data: any;
		pathname: string;
	}

	let { data, pathname }: Props = $props();
	const items = data.items;

	let tabContainer: HTMLDivElement | undefined = $state();

	let isInEnd: boolean = $state(false);
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

	let lastPathitem = $derived(pathname.split('/').pop());
</script>

<!-- <button on:click={scrollToNextTab}>Rolar para Próxima Tab</button> -->
<div class="grid grid-cols-[1fr_auto]">
	<div bind:this={tabContainer} class="tab-container flex">
		{#each items as item, i}
			<a
				href="./{item.name}"
				aria-current={lastPathitem === item.name ? 'page' : undefined}
				class="text-3xl tab-anchor px-3.5! {lastPathitem === item.name
					? 'text-primary-500 font-semibold'
					: ''}"
				id={`tabAnchor-${i}`}
			>
				{item.icon}
			</a>
		{/each}
	</div>
	{#if isInEnd}
		<button
			type="button"
			class="m-auto btn-icon preset-filled-white-500 md:hidden"
			onclick={scrollToStart}
			><span class="flex pb-2 align-center justify-center text-4xl"> « </span>
		</button>
	{:else}
		<button
			type="button"
			class="m-auto btn-icon preset-filled-white-500 md:hidden"
			onclick={scrollToEnd}
		>
			<span class="flex pb-2 align-center justify-center text-4xl"> » </span>
		</button>
	{/if}
</div>
