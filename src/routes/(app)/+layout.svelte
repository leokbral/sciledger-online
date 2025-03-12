<script lang="ts">
	import { page } from '$app/state';
	import {
		AppBar, Tabs } from '@skeletonlabs/skeleton-svelte';
	import Nav from '$lib/Nav.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
	//console.log('chamou layout 26', page.data.user, data.user);
</script>

<svelte:head>{@html '<script>(' + autoModeWatcher.toString() + ')();</script>'}</svelte:head>
<AppShell>
	{#snippet header()}
	
			<AppBar slotLead="md:ml-20" slotTrail="md:mr-20" gridColumns="grid-cols-[1fr_auto_auto]">
				{#snippet lead()}
					
						<a
							data-sveltekit-reload
							href="/"
							class="nav-link"
							class:active={page.url.pathname === '/login'}
						>
							SciLedger
						</a>
					
					{/snippet}
				{#if page.data.user}
					<Tabs
						justify="justify-center"
						hover="hover:preset-tonal-primary"
						flex="flex-1 lg:flex-none"
						rounded=""
						border=""
						class="bg-surface-100-900 w-full"
					>
						<Tabs.Control href="/publish" selected={page.url.pathname === '/publish'}>
							<span>Publish</span>
						</Tabs.Control>
						<Tabs.Control href="/review" selected={page.url.pathname === '/review'}>
							<span>Review</span>
						</Tabs.Control>
					</Tabs>
				{/if}
				{#snippet trail()}
					
						<span class="!z-[10]">
							<LightSwitch />
						</span>
						<Nav pathname={page.url.pathname} user={data.user}></Nav>
					
					{/snippet}
			</AppBar>
		
	{/snippet}
	{#snippet sidebarLeft()}
		<svelte:fragment ></svelte:fragment>
	{/snippet}
	{#snippet sidebarRight()}
		<svelte:fragment ></svelte:fragment>
	{/snippet}

	{@render children?.()}
</AppShell>
