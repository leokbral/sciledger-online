<script lang="ts">
	import { page } from '$app/state';
	import { AppBar, Navigation, Tabs } from '@skeletonlabs/skeleton-svelte';
	import Nav from '$lib/Nav.svelte';
	import type { PageData } from './$types';
	import { Toaster } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';
	
	interface Props {
		data: PageData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();



	function toggleDarkMode() {
		//document.documentElement.classList.toggle('dark');
		console.log('toggleDarkMode');
		if (document.documentElement.classList.contains('dark')) {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('dark', 'false');
		} else {
			document.documentElement.classList.add('dark');
			localStorage.setItem('dark', 'true');
		}
	}
</script>

<svelte:head>
	<title>Break Free from Nature</title>
</svelte:head>

<!-- <svelte:head>{@html '<script>(' + autoModeWatcher.toString() + ')();</script>'}</svelte:head> -->
<div class="grid grid-rows-[auto_1fr_auto]">
	<!-- Header -->
	<header class="">
		<AppBar background="">
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

			{#snippet trail()}
				{#if page.data.user}
					<Navigation.Bar height="h-10" background="">
						<Navigation.Tile
							label="Publish"
							href="/publish"
							selected={page.url.pathname === '/publish'}
							active="bg-transparent border-b-2 border-primary-500 rounded-none"
							width='w-24'
						></Navigation.Tile>
						<Navigation.Tile
							label="Review"
							href="/review"
							selected={page.url.pathname === '/review'}
							active="bg-transparent border-b-2 border-primary-500 rounded-none"
							width='w-24'
						></Navigation.Tile>
						<Navigation.Tile
							label="Hub"
							href="/hub"
							selected={page.url.pathname === '/hub'}
							active="bg-transparent border-b-2 border-primary-500 rounded-none"
							width='w-24'
						></Navigation.Tile>
					</Navigation.Bar>
				{/if}
				<span class="z-10!">
					<button
						aria-label="Toggle dark mode."
						class="btn-icon hover:preset-tonal   "
						title="Toggle dark mode."
						data-lightswitch=""
						onclick={toggleDarkMode}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-sun-moon"
							><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"></path><path d="M12 2v2"
							></path><path d="M12 20v2"></path><path d="m4.9 4.9 1.4 1.4"></path><path
								d="m17.7 17.7 1.4 1.4"
							></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.3 17.7-1.4 1.4"
							></path><path d="m19.1 4.9-1.4 1.4"></path></svg
						>
					</button>
				</span>
				<Nav pathname={page.url.pathname} user={data.user} notifications={data.notifications}></Nav>
			{/snippet}
		</AppBar>
		{#if !data.user}
			<div class="banner bg-primary-900 p-8 text-surface-50">
				<div class=" flex flex-col items-center gap-4 m-auto w-full">
					<h1 class="h1">SciLedger</h1>
					<p>Blockchain Based Open Science</p>
					Consider rethinking your decision to invest substantial amounts
				</div>
			</div>
		{/if}
	</header>
	<!-- Page -->
	<div class="container mx-auto grid grid-cols-1 xl:grid-cols-[200px_minmax(0px,_1fr)_200px]">
		<!-- Sidebar (Left) -->
		<!-- NOTE: hidden in smaller screen sizes -->
		<aside class="sticky top-0 col-span-1 hidden h-screen p-4 xl:block">
			{#snippet sidebarLeft()}
				L
			{/snippet}
		</aside>
		<!-- Main -->
		<main class="col-span-1 space-y-4 p-4">
			{@render children?.()}
		</main>
		<!-- Sidebar (Right) -->
		<!-- NOTE: hidden in smaller screen sizes -->
		<aside class="sticky top-0 col-span-1 hidden h-screen p-4 xl:block">
			{#snippet sidebarRight()}
				R
			{/snippet}
		</aside>
	</div>
	<!-- Footer -->
	<footer class="bg-blue-500 p-4">(footer)</footer>
</div>
<Toaster {toaster} />

<!-- <AppShell>
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
					
						<span class="z-10!">
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
</AppShell> -->
