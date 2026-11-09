<script lang="ts">
	import HubWorkspacePage from '$lib/Pages/Hub/HubWorkspacePage.svelte';
	import PublicHubPage from '$lib/Pages/Hub/PublicHubPage.svelte';

	let { data } = $props();
</script>

{#key data.hub._id + String('isPublic' in data)}
	{#if 'isPublic' in data && data.isPublic}
		<PublicHubPage hub={data.hub} papers={data.publishedPapers} loggedIn={!!data.user} />
	{:else}
		<HubWorkspacePage {data} />
	{/if}
{/key}
