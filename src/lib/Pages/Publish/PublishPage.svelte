<script lang="ts">
	import AuthorDashboard from '$lib/AuthorDashboard.svelte';
	import MyPapers from '$lib/MyPapers.svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';

	let tabSet = $state('tab0'); //AKI muda qual tab está ativa primeiro

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	let tabs = data.tabs;
	let papers = data.papersData;
	// let publishedPapers = data.papersData[4];
	let publishedPapers = papers
		.flat()
		.filter((paper: { status: string }) => paper.status === 'published');

	let user = data.user;

	// console.log('Publish tabs', tabs);
	console.log('Publish papers', papers);
	// console.log('Publish user', user);
	// console.log('Publish paper', publishedPapers);
</script>

<div class="container page p-4 m-auto">
	<div>
		<!-- <AuthorDashboard> </AuthorDashboard> -->
		<AuthorDashboard {user} {publishedPapers} />
	</div>
	<div class="text-xl font-bold mb-6">Your Activities</div>

	<Tabs value={tabSet} onValueChange={(e) => (tabSet = e.value)}>
		{#snippet list()}
			{#each tabs as tab, value}
				<Tabs.Control value="tab{value}">
					<div class="flex justify-center">
						<Icon icon={tab.icon} style="font-size: 2rem;" />
					</div>
					<span>{tab.name}</span>
				</Tabs.Control>
			{/each}
		{/snippet}
		<!-- Tab Panels --->
		{#snippet content()}
			<div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
				<div class="">
					<a
						data-sveltekit-reload
						href="/publish/new"
						class="btn preset-filled-primary-500 text-white"
						data-sveltekit-preload-data="hover"
					>
						Submit a New Article
					</a>
				</div>
				{#each papers as papersData, i}
					{#if tabSet === 'tab' + i.toString()}
						<div class="card page max-w-[700px] p-4 m-auto">
							<div class="text-surface-900">
								<MyPapers rota={tabs[i].rota} {papersData}></MyPapers>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/snippet}
	</Tabs>
</div>
