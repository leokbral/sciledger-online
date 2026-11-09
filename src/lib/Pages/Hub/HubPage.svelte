<script lang="ts">
	import type { HubSummary } from './hubTypes';
	import HubList from './HubList.svelte';
	let { hubs, loggedIn = false }: { hubs: HubSummary[]; loggedIn?: boolean } = $props();
	let directoryHubs = $derived(
		hubs.map((hub) => ({
			...hub,
			description: hub.description
				?.replace(/<[^>]*>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
		}))
	);
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<section class="rounded-lg border border-surface-200 bg-white p-5 shadow-sm md:p-6">
		<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
			<div class="max-w-3xl">
				<p class="text-xs font-semibold uppercase text-primary-700">Hub Directory</p>
				<h1 class="mt-3 text-3xl font-semibold leading-tight text-surface-950 md:text-4xl">
					{loggedIn ? 'Open a Hub workspace' : 'Explore Hubs'}
				</h1>
				<p class="mt-3 text-base leading-relaxed text-surface-600">
					Each Hub has its own workspace, navigation, and dashboard based on your role inside that
					Hub.
				</p>
			</div>
			{#if loggedIn}
				<a
					href="/hub/new"
					class="btn preset-tonal-primary inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-semibold"
				>
					Create Hub
				</a>
			{/if}
		</div>
	</section>

	<section class="rounded-lg border border-surface-200 bg-white p-5 shadow-sm">
		<header class="mb-4">
			<h2 class="text-xl font-semibold text-surface-950">{loggedIn ? 'Your Hubs' : 'Hubs'}</h2>
			<p class="mt-1 text-sm text-surface-600">
				Select a Hub to enter the workspace assigned by your role in that Hub.
			</p>
		</header>
		<HubList
			hubs={directoryHubs}
			emptyTitle="No hubs available yet"
			emptyDescription="Create or join a Hub to start using role-specific workspaces."
			variant="cards"
			showSubmit
			{loggedIn}
		/>
	</section>
</div>
