<script lang="ts">
	import PublishedPaperView from '$lib/components/Paper/PublishedPaperView.svelte';
	import type { PageData } from './$types';

	// Receber os dados do servidor
	export let data: PageData;

	// O paper já vem filtrado do servidor (publicado e revisado pelo usuário)
	$: reviewedPublishedPaper = data.paper;
</script>

<PublishedPaperView paper={reviewedPublishedPaper} showReviewedBadge={true} />
