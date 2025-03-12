<script lang="ts">
	import { run } from 'svelte/legacy';

	import { page } from '$app/state';

	// Docs
	import LayoutPage from '$lib/layouts/LayoutPage/LayoutPage.svelte';
	// Components
	import { Tab, Tabs } from '@skeletonlabs/skeleton-svelte';
	// Types
	import type { DocsShellSettings } from '$lib/layouts/DocsShell/types';
	// Partials
	import Header from '$lib/layouts/DocsShell/partials/Header.svelte';
	import PanelProps from '$lib/layouts/DocsShell/partials/PanelProps.svelte';
	import PanelClasses from './partials/PanelClasses.svelte';
	import PanelEvents from './partials/PanelEvents.svelte';
	import PanelKeyboard from './partials/PanelKeyboard.svelte';
	import PanelParams from './partials/PanelParams.svelte';
	import PanelSlots from './partials/PanelSlots.svelte';
	// Utilities
	import { docShellDefaults } from '$lib/layouts/DocsShell/defaults';
	// SvelteKit
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// Props
	interface Props {
		settings: DocsShellSettings;
		tabs?: boolean;
		sandbox?: import('svelte').Snippet;
		usage?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	}

	let {
		settings,
		tabs = true,
		sandbox,
		usage,
		children
	}: Props = $props();

	// Classes
	const cBase = 'relative';
	const cTabs = 'max-w-5xl mx-auto hide-scrollbar'; // sticky top-0 z-[1]
	const cPanels = 'space-y-10';

	// Local
	const defaultTab = 'usage';
	let tabPanel = $state(page.url.searchParams.get('tab') || defaultTab);

	// Page Data
	const pageData: DocsShellSettings = {
		// Define defaults first
		...docShellDefaults,
		// Local Overrides
		...{ docsPath: page.url.pathname },
		// Prop Settings Values
		...settings
	};

	// Sveld Counts ---
	// Conditional tab display based on Sveld reference counts
	const sveldCounts = $state({ props: 0, slots: 0, events: 0 });
	if (pageData.components && pageData.components?.length > 0) {
		pageData.components.forEach((comp) => {
			sveldCounts.props += comp.sveld.props.length;
			sveldCounts.slots += comp.sveld.slots.length;
			sveldCounts.events += comp.sveld.events.length;
		});
	}

	// Reactive
	let classesBase = $derived(`${cBase}`);
	let classesTabs = $derived(`${cTabs}`);
	let classesPanels = $derived(`${cPanels}`);
	// Handle tab URL param for deep linking
	run(() => {
		if (browser) {
			const url = new URL(page.url);
			url.searchParams.delete('tab');
			if (tabPanel !== defaultTab) url.searchParams.set('tab', tabPanel);
			goto(url, { replaceState: true });
		}
	});
</script>

<LayoutPage class="doc-shell {classesBase}" tocKey={tabPanel}>
	<!-- Header -->
	<Header {pageData} />

	<!-- Tabs -->
	{#if tabs}
		<Tabs class={classesTabs}>
			<Tab bind:group={tabPanel} name="panels" value="usage">Usage</Tab>
			{#if sveldCounts.props > 0}<Tab bind:group={tabPanel} name="properties" value="properties">Props</Tab>{/if}
			{#if pageData?.parameters?.length}<Tab bind:group={tabPanel} name="parameters" value="parameters">Params</Tab>{/if}
			{#if sveldCounts.slots > 0}<Tab bind:group={tabPanel} name="slots" value="slots">Slots</Tab>{/if}
			{#if pageData?.classes?.length}<Tab bind:group={tabPanel} name="classes" value="classes">Classes</Tab>{/if}
			{#if sveldCounts.events > 0}<Tab bind:group={tabPanel} name="events" value="events">Events</Tab>{/if}
			{#if pageData?.keyboard?.length}<Tab bind:group={tabPanel} name="keyboard" value="keyboard">Keyboard</Tab>{/if}
		</Tabs>
	{/if}

	<!-- Panels -->
	<div id="panels" class={classesPanels}>
		<!-- Panel: Usage -->
		{#if tabPanel === 'usage'}
			<!-- Slot: Sandbox -->
			{#if sandbox}
				<h2 class="sr-only">Demo</h2>
				{@render sandbox?.()}
			{/if}
			<!-- Slot: Usage -->
			{#if usage}{@render usage()}{:else}(usage){/if}
			<!-- Slot: Default -->
			{@render children?.()}
		{/if}
		<!-- Panel: properties -->
		{#if tabPanel === 'properties'}<PanelProps {pageData} />{/if}
		<!-- Panel: parameters -->
		{#if tabPanel === 'parameters'}<PanelParams {pageData} />{/if}
		<!-- Panel: slots -->
		{#if tabPanel === 'slots'}<PanelSlots {pageData} />{/if}
		<!-- Panel: classes -->
		{#if tabPanel === 'classes'}<PanelClasses {pageData} />{/if}
		<!-- Panel: events -->
		{#if tabPanel === 'events'}<PanelEvents {pageData} />{/if}
		<!-- Panel: keyboard -->
		{#if tabPanel === 'keyboard'}<PanelKeyboard {pageData} />{/if}
	</div>
</LayoutPage>