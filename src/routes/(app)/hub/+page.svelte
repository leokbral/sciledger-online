<script lang="ts">
	import HubPage from '$lib/Pages/Hub/HubPage.svelte';
	let { data } = $props();
</script>

<div class="container page p-4 m-auto space-y-8">
	<HubPage hubs={data.hubs} loggedIn={!!data.user} />
</div>
