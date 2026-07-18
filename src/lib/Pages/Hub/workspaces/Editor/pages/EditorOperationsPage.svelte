<script lang="ts">
	import type { Snippet } from 'svelte';
	import HubList from '../../../HubList.svelte';
	import type { HubSummary } from '../../../hubTypes';

	interface Props {
		hubs: HubSummary[];
		loading: boolean;
		error: string | null;
		workspace?: Snippet;
	}

	let { hubs, loading, error, workspace }: Props = $props();
</script>

<section id="editor-operations" class="scroll-mt-24">
	{#if workspace}
		{@render workspace()}
	{:else}
		<HubList
			{hubs}
			{loading}
			{error}
			emptyTitle="No editorial hub selected"
			emptyDescription="Open a Hub to begin coordinating editorial workflows."
			variant="table"
		/>
	{/if}
</section>
