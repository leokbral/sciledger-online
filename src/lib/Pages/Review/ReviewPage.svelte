<script lang="ts">
	import ReviewDashboard from '$lib/ReviewDashboard.svelte';
	import MyPapers from '$lib/MyPapers.svelte';
	import { Tab, Tabs } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';

	let tabSet: number = $state(0);

	interface Props {
		data: any;
		requested?: import('svelte').Snippet;
	}

	let { data, requested }: Props = $props();
	//export let tabs;
	//export let papers;
	let tabs = data.tabs;
	let papers = data.papersData;
	let reviews = data.reviews; // Recebendo as revisões
	let user = data.user;

	console.log('Review tabs', tabs);
	console.log('Review papers', papers);
	console.log('Review data', reviews);  // Verificando as revisões
</script>

<div class="container page p-4 m-auto">
	<div>
		<ReviewDashboard {reviews} {user}></ReviewDashboard>
		<!--TEM QUE PASSAR OS DADOS DO REVISOR AQUI-->
	</div>
	<div class="text-xl font-bold mb-6">Your Activities</div>

	<Tabs justify="justify-center">
		{#each tabs as tab, value}
			<Tab bind:group={tabSet} name="tab{value}" {value}>
				<div class="flex justify-center">
					<Icon icon={tab.icon} style="font-size: 2rem;" />
				</div>
				<span>{tab.name}</span>
			</Tab>
		{/each}
		<!-- Tab Panels --->
		{#snippet panel()}
			
				<!-- <div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]"> -->
				<div class="grid gap-3 w-full">
					{#each papers as papersData, i}
						{#if tabSet === i}
							<div class="card page p-4 m-auto">
								{#if tabs[i].name === 'Papers Pool'}
									{@render requested?.()}
								{:else}
									<div class="text-surface-900">
										<MyPapers rota={tabs[i].rota} {papersData}></MyPapers>
									</div>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			
			{/snippet}
	</Tabs>
</div>
