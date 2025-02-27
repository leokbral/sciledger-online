<script lang="ts">
	import { page } from '$app/stores';
	import {
		AppBar,
		AppShell,
		TabGroup,
		TabAnchor,
		LightSwitch,
		autoModeWatcher
	} from '@skeletonlabs/skeleton';
	import Nav from '$lib/Nav.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	//console.log('chamou layout 26', $page.data.user, data.user);
</script>

<svelte:head>{@html '<script>(' + autoModeWatcher.toString() + ')();</script>'}</svelte:head>
<AppShell>
	<svelte:fragment slot="header">
		<AppBar slotLead="md:ml-20" slotTrail="md:mr-20" gridColumns="grid-cols-[1fr_auto_auto]">
			<svelte:fragment slot="lead">
				<a
					data-sveltekit-reload
					href="/"
					class="nav-link"
					class:active={$page.url.pathname === '/login'}
				>
					SciLedger
				</a>
			</svelte:fragment>
			{#if $page.data.user}
				<TabGroup
					justify="justify-center"
					hover="hover:variant-soft-primary"
					flex="flex-1 lg:flex-none"
					rounded=""
					border=""
					class="bg-surface-100-800-token w-full"
				>
					<TabAnchor href="/publish" selected={$page.url.pathname === '/publish'}>
						<span>Publish</span>
					</TabAnchor>
					<TabAnchor href="/review" selected={$page.url.pathname === '/review'}>
						<span>Review</span>
					</TabAnchor>
				</TabGroup>
			{/if}
			<svelte:fragment slot="trail">
				<span class="!z-[10]">
					<LightSwitch />
				</span>
				<Nav pathname={$page.url.pathname} user={data.user}></Nav>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>
	<svelte:fragment slot="sidebarLeft"></svelte:fragment>
	<svelte:fragment slot="sidebarRight"></svelte:fragment>

	<slot />
</AppShell>
