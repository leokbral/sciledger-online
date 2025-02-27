<script lang="ts">
	import AuthorDashboard from '$lib/AuthorDashboard.svelte';
	import MyPapers from '$lib/MyPapers.svelte';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import Icon from '@iconify/svelte';
	import { userProfiles } from '../../../routes/(app)/UserProfile';

	let tabSet: number = 0;
	let user = userProfiles[0];

	export let data;

	//console.log("data 13--> ", data)
	let tabs = data.tabs;
	let tabsContent = data.tabsContent;
</script>

<div class="container page p-4 m-auto">
	<TabGroup justify="justify-center">
		{#each tabs as tab, value}
			<Tab bind:group={tabSet} name="tab{value}" {value}>
				<div class="flex justify-center">
					<Icon icon={tab.icon} style="font-size: 2rem;" />
				</div>
				<span>{tab.name}</span>
			</Tab>
		{/each}
		<!-- Tab Panels --->
		<svelte:fragment slot="panel">
			<div class="grid gap-3 md:grid-cols-1">
				{#if tabSet === 0}
					<div class="card page max-w-[700px] p-4 m-auto">
						<div class="text-surface-900">
							<MyPapers papersData={tabsContent[0]}></MyPapers>
						</div>
					</div>
				{:else if tabSet === 1}
					<div class="card page max-w-[700px] p-4 m-auto">
						<div class="text-surface-900">
							{tabsContent[1]}
						</div>
					</div>
				{:else if tabSet === 2}
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
				{/if}
				<!-- {/each} -->
			</div>
		</svelte:fragment>
	</TabGroup>
</div>
