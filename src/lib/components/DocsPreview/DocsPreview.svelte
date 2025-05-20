<!-- @migration-task Error while migrating Svelte code: $$props is used together with named props in a way that cannot be automatically migrated. -->
<script lang="ts">
    import { slide } from 'svelte/transition';
    import { Segment } from '@skeletonlabs/skeleton-svelte';
    import { backgrounds } from './options';

    // Initialize props with defaults using $props()
    let {
        label = '',
        responsive = false,
        background = 'primary-to-secondary',
        regionHeader = '',
        regionViewport = '',
        regionPreview = '',
        regionFooter = '',
        regionSource = '',
        className = ''
    } = $props<{
        label?: string;
        responsive?: boolean;
        background?: string;
        regionHeader?: string;
        regionViewport?: string;
        regionPreview?: string;
        regionFooter?: string;
        regionSource?: string;
        className?: string;
    }>();

    // Add render props for slots
    // const slots = $props<{
    //     lead?: () => any;
    //     preview?: () => any;
    //     trail?: () => any;
    //     footer?: () => any;
    //     source?: () => any;
    // }>();

    // Local state
    let tabView = $state<string | null>('preview');
    let radioSize = $state<string | null>('full');
    let swatches = $state<boolean>(false);

    // Classes
    let cBase = 'shadow-2xl shadow-surface-500/10 dark:shadow-black/10 rounded-container overflow-hidden';
    let cHeader = 'bg-surface-200-800 p-4 flex justify-between items-center gap-4';
    let cSwatches = 'preset-tonal p-4 grid grid-cols-6 sm:grid-cols-12 gap-2';
    let cSwatchCell = 'ring-[1px] ring-surface-500/50 aspect-square rounded-sm';
    let cViewport = 'p-4 md:p-10 space-y-4';
    let cContent = 'flex justify-center items-center mx-auto transition-[width] duration-200';
    let cFooter = 'preset-tonal p-4';
    let cSource = 'bg-surface-100-900 p-4 space-y-4';

    // Functions
    function toggleSwatches(): void {
        swatches = !swatches;
    }

    function swatchHandler(key: string): void {
        background = key;
    }

    // Convert reactive statements to derived values
    let resizableWidth = $derived(radioSize === 'mobile' ? 'w-[320px]' : 'w-full');
    let classesBase = $derived(`${cBase} ${className}`);
    let classesHeader = $derived(`${cHeader} ${regionHeader}`);
    let classesSwatches = $derived(`${cSwatches}`);
    let classesViewport = $derived(`${cViewport} ${backgrounds[background]} ${regionViewport}`);
    let classesPreview = $derived(`${cContent} ${resizableWidth} ${regionPreview}`);
    let classesFooter = $derived(`${cFooter} ${regionFooter}`);
    let classesSource = $derived(`${cSource} ${regionSource}`);
</script>

<div class="previewer {classesBase}">
	<!-- Header -->
	<header class="previewer-header {classesHeader}">
		{#if label}
			<span class="text-2xl font-bold capitalize">{label}</span>
		{:else}
			<!-- View Toggle -->
			<Segment name="view" value={tabView} onValueChange={(e) => (tabView = e.value)}>
				<Segment.Item value="preview"><i class="fa-solid fa-eye text-sm"></i></Segment.Item>
				<Segment.Item value="code"><i class="fa-solid fa-code text-sm"></i></Segment.Item>
			</Segment>
			<div class="flex justify-between gap-4">
				<!-- Responsive Settings -->
				{#if responsive}
					<!-- <Segment class="hidden md:flex"> -->
						<Segment name="radioSize" value={radioSize} onValueChange={(e) => (radioSize = e.value)}>
						<Segment.Item value="mobile"
							><i class="fa-solid fa-mobile-screen text-sm"></i></Segment.Item
						>
						<Segment.Item value="full"
							><i class="fa-solid fa-display text-sm"></i></Segment.Item
						>
					</Segment>
				{/if}
				<!-- Toggle Swatches -->
				<button
					class="btn-icon {swatches ? 'preset-filled' : 'preset-tonal'}"
					onclick={toggleSwatches}
					title="Backgrounds"
					aria-label="Backgrounds"
				>
					<i class="fa-solid fa-swatchbook text-sm"></i>
				</button>
			</div>
		{/if}
	</header>
	{#if tabView === 'preview'}
		<!-- Swatches -->
		{#if swatches}
			<div class="previewer-swatches {classesSwatches}" transition:slide={{ duration: 200 }}>
				{#each Object.entries(backgrounds) as [k, v], i}
					<!-- prettier-ignore -->
					<button type="button" class="{cSwatchCell} {v}" onclick={() => { swatchHandler(k) }} title={k}>
						{#if i === 0}<i class="fa-regular fa-circle-xmark text-xl"></i>{/if}
					</button>
				{/each}
			</div>
		{/if}
		<!-- Viewport -->
		<!-- <div class="previewer-viewport {classesViewport}">
			 <! -- Render: Lead -- >
            {#if slots.lead}
                <div class="previewer-lead">
                    {@render slots.lead()}
                </div>
            {/if}
            <! -- Render: Preview -- >
            <div class="previewer-preview {classesPreview}">
                {@render slots.preview?.() }
            </div>
            <! -- Render: Trail -- >
            {#if slots.trail}
                <div class="previewer-trail">
                    {@render slots.trail()}
                </div>
            {/if}
		</div> -->
		AGORA?????????
		<!-- {#if slots.footer}
            <footer class="previewer-footer {classesFooter}">
                {@render slots.footer()}
            </footer>
        {/if} -->
	{:else if tabView === 'code'}
		<!-- Source -->
		<!-- <div class="previewer-source {classesSource}">
			{@render slots.source?.()}
		</div> -->
		Sera???????
	{/if}
</div>
