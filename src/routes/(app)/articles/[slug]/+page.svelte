<script lang="ts">
	import PublishedPaperView from '$lib/components/Paper/PublishedPaperView.svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();
	let paper = data.paper;
</script>

<svelte:head>
	<title>{data.paper?.title}</title>
</svelte:head>

<PublishedPaperView {paper} showReviewedBadge={false} />
