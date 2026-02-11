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
			<div class="flex justify-center w-full">
				{#each tabs as tab, value}
					<Tabs.Control value="tab{value}">
						<div class="flex justify-center">
							<Icon icon={tab.icon} style="font-size: 2rem;" />
						</div>
						<span>{tab.name}</span>
					</Tabs.Control>
				{/each}
			</div>
		{/snippet}
		<!-- Tab Panels --->
		{#snippet content()}
			<div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
				<div class="flex flex-col gap-2 w-fit">
					<!-- Download Template Button -->
					<a
						href="/paper-template.docx"
						download="SciLedger_Paper_Template.docx"
						class="btn preset-outlined-primary-500 text-primary-500 border-2 flex items-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-sm px-4 py-2 whitespace-nowrap"
					>
						<Icon icon="mdi:download" style="font-size: 1.25rem;" />
						<span>Download Paper Template</span>
					</a>
					
					<!-- Submit New Article Button -->
					<a
						data-sveltekit-reload
						href="/publish/new"
						class="btn preset-filled-primary-500 text-white flex items-center gap-2 text-sm px-4 py-2 whitespace-nowrap"
						data-sveltekit-preload-data="hover"
					>
						<Icon icon="mdi:file-document-plus" style="font-size: 1.25rem;" />
						<span>Submit a New Article</span>
					</a>
				</div>
				{#each papers as papersData, i}
					{#if tabSet === 'tab' + i.toString()}
						<div class="card page max-w-[700px] p-4 m-auto">
							<div class="text-surface-900">
								<MyPapers rota={tabs[i].rota} {papersData} currentUser={user}></MyPapers>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/snippet}
	</Tabs>
</div>
