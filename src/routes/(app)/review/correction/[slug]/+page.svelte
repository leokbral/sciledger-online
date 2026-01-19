<script lang="ts">
	import { page } from '$app/stores';
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';
	import type { User } from '$lib/types/User';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper = data.paper as Paper;
	let currentUser = $page.data.user as User;
	let isHubOwner = (data as any).isHubOwner as boolean;
</script>

{#if paper}
	<PaperReviewPage
		{paper}
		{currentUser}
		messageFeed={null}
		isHubAdmin={isHubOwner}
	/>
{/if}
