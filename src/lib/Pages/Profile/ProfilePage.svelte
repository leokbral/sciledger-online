<script lang="ts">
	import AuthorDashboard from '$lib/AuthorDashboard.svelte';
	import MyPapers from '$lib/MyPapers.svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { userProfiles } from '../../../routes/(app)/UserProfile';

	let tabSet: string = $state('');
	let user = userProfiles[0];

	let group = $state('plane');

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	//console.log("data 13--> ", data)
	let tabs = data.tabs;
	let tabsContent = data.tabsContent;
</script>

<div class="container page p-4 m-auto">
	<Tabs value={group} onValueChange={(e) => (group = e.value)}>
		{#snippet list()}
			{#each tabs as tab, value}
				<Tabs.Control value="tab{value}">
					{#snippet lead()}
						<div class="flex justify-center">
							<Icon icon={tab.icon} style="font-size: 2rem;" />
						</div>
					{/snippet}
					<span>{tab.name}</span>
				</Tabs.Control>
			{/each}
		{/snippet}
		<!-- Tab Panels --->
		{#snippet content()}
			<div class="grid gap-3 md:grid-cols-1">
				<Tabs.Panel value={tabs[0].value}>
					<div class="card page max-w-[700px] p-4 m-auto">
						<div class="text-surface-900">
							<MyPapers papersData={tabsContent[0]}></MyPapers>
						</div>
					</div>
				</Tabs.Panel>
				<Tabs.Panel value={tabs[1].value}>
					<div class="card page max-w-[700px] p-4 m-auto">
						<div class="text-surface-900">
							{tabsContent[1]}
						</div>
					</div>
				</Tabs.Panel>
				<Tabs.Panel value={tabs[2].value}>
					<div class="card page max-w-[700px] p-4 m-auto">
						<div class="text-surface-900">
							{tabsContent[2]}
							<div class="text-surface-900">
								<div class="mt-4">
									<h2 class="text-xl font-semibold">Contact Information</h2>
									<p class="mt-2"><strong>Email:</strong> {user.email}</p>
								</div>
							</div>
						</div>
					</div>
				</Tabs.Panel>
				
				<!-- {/each} -->
			</div>
		{/snippet}
	</Tabs>
</div>
