<script>
	import { page } from '$app/state';
	import PaperPreview from './PaperPreview.svelte';

	/** @type {{papers: any}} */
	let { papers } = $props();
</script>

{#if papers.length === 0}
	<div class="paper-preview">No papers are here... yet.</div>
{:else}
	<div>
		{#each papers as paper}<!-- {#each papers as paper (paper.slug)} -->
			<PaperPreview {paper} user={page.data.user} />
		{/each}
	</div>
{/if}
