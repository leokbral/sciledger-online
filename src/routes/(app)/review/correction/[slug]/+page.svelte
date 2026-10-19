<script lang="ts">
	import PaperReviewPage from '$lib/Pages/Paper/PaperReviewPage.svelte';
	import PlatformAdminNotice from '$lib/components/PlatformAdmin/PlatformAdminNotice.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';
	import type { User } from '$lib/types/User';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let paper = data.paper as Paper;
	let currentUser = data.user as User;
	let isHubOwner = (data as any).isHubOwner as boolean;
</script>

{#if data.isSuperUserView}
	<div class="mx-auto max-w-5xl px-4 pt-6">
		<PlatformAdminNotice view="reviewer" />
	</div>
{/if}

{#if paper}
	<PaperReviewPage
		{paper}
		{currentUser}
		messageFeed={null}
		isHubAdmin={isHubOwner}
		canSubmitReview={(data as any).canSubmitReview === true}
		canViewSubmittedReviews={(data as any).canViewSubmittedReviews === true}
		reviewerPreview={data.isSuperUserView === true}
	/>
{/if}
