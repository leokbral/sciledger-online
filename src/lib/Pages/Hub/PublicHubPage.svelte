<script lang="ts">
	import type { PublicHub } from '$lib/server/publicHubs';
	import HubIdentityHeader from './HubIdentityHeader.svelte';
	import PapersSection from '$lib/components/PapersSection/PapersSection.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { Hub } from '$lib/types/Hub';
	let {
		hub,
		papers = [],
		loggedIn = false
	}: {
		hub: PublicHub;
		papers?: Array<{ id: string; title: string; status: string; [key: string]: unknown }>;
		loggedIn?: boolean;
	} = $props();
	let headerHub = $derived({
		...hub,
		description: hub.description
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
		socialMedia: Object.fromEntries(hub.socialMedia.map((link) => [link.name, link.url]))
	});
</script>

<svelte:head>
	<title>{hub.title} | SciLedger</title>
	<meta name="description" content={headerHub.description.slice(0, 160)} />
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 pb-16 lg:space-y-10">
	<HubIdentityHeader
		hub={headerHub}
		identityStats={[{ label: 'Published', value: papers.length }]}
	/>
	<section id="papers" class="scroll-mt-28">
		<PapersSection
			papers={papers as unknown as Paper[]}
			hub={headerHub as unknown as Hub}
			isCreator={false}
			isHubManager={false}
			userId=""
			shouldHighlight={() => false}
			publicView={!loggedIn}
		/>
	</section>
</div>
