<script lang="ts">
	import ReviewDashboard from '$lib/ReviewDashboard.svelte';
	import ReviewerInvitations from '$lib/components/ReviewerInvitations/ReviewerInvitations.svelte';
	import MyPapers from '$lib/MyPapers.svelte';
	import { Tabs } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import Notifications from '$lib/components/Notifications/Notifications.svelte';
	import NotificationBadge from '$lib/components/Notifications/NotificationBadge.svelte';

	let tabSet = $state('tab0');

	let initialNotifications: never[] = [];

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
	let reviewerInvitations = data.reviewerInvitations;

	// console.log('Review tabs', tabs);
	// console.log('Review papers', papers);
	// console.log('Review data', reviews); // Verificando as revisões
	console.log('reviewerInvitations', reviewerInvitations); // Verificando as revisões
</script>

<div class="container page p-4 m-auto">
	<div>
		<ReviewDashboard {reviews} {user}></ReviewDashboard>
		<!-- <ReviewerInvitations {reviewerInvitations} /> -->
		<!-- <Notifications notifications={initialNotifications} /> -->
		<!-- <NotificationBadge unreadCount={initialNotifications.length} /> -->
		<!--TEM QUE PASSAR OS DADOS DO REVISOR AQUI-->
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
			<!-- <div class="grid gap-3 md:grid-cols-[1fr_auto_1fr]"> -->
			<div class="grid gap-3 w-full">
				{#each papers as papersData, i}
					{#if tabSet === 'tab' + i.toString()}
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
