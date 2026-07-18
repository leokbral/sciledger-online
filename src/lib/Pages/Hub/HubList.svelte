<script lang="ts">
	import type { HubSummary } from './hubTypes';
	import { hubHref, hubImageUrl } from './hubMetrics';

	type Variant = 'cards' | 'compact' | 'table';

	interface Props {
		hubs: HubSummary[];
		loading?: boolean;
		error?: string | null;
		emptyTitle: string;
		emptyDescription: string;
		variant?: Variant;
	}

	let {
		hubs,
		loading = false,
		error = null,
		emptyTitle,
		emptyDescription,
		variant = 'cards'
	}: Props = $props();
</script>

{#if loading}
	<div class={variant === 'table' ? 'space-y-2' : 'grid gap-4 md:grid-cols-2'}>
		{#each Array(4) as _}
			<div class="h-32 animate-pulse rounded-lg bg-surface-100"></div>
		{/each}
	</div>
{:else if error}
	<div class="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
		Error: {error}
	</div>
{:else if hubs.length === 0}
	<div class="rounded-lg border border-dashed border-surface-300 bg-surface-50 p-8">
		<h3 class="text-lg font-semibold text-surface-950">{emptyTitle}</h3>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-surface-600">{emptyDescription}</p>
	</div>
{:else if variant === 'table'}
	<div class="overflow-hidden rounded-lg border border-surface-200">
		{#each hubs as hub}
			<a
				href={hubHref(hub)}
				class="grid gap-3 border-b border-surface-200 bg-white px-4 py-3 transition last:border-b-0 hover:bg-surface-50 md:grid-cols-[1.3fr_0.8fr_1.5fr]"
				data-sveltekit-preload-data="hover"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-surface-950">
						{hub.title ?? 'Untitled hub'}
					</p>
					<p class="text-xs font-semibold uppercase text-primary-700">{hub.type ?? 'Hub'}</p>
				</div>
				<p class="text-sm text-surface-600">{hub.status ?? 'Active'}</p>
				<p class="line-clamp-1 text-sm text-surface-600">
					{hub.description ?? 'No description yet.'}
				</p>
			</a>
		{/each}
	</div>
{:else if variant === 'compact'}
	<div class="space-y-3">
		{#each hubs as hub}
			<a
				href={hubHref(hub)}
				class="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3 shadow-sm transition hover:border-primary-300 hover:shadow-md"
				data-sveltekit-preload-data="hover"
			>
				<div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-100">
					{#if hub.logoUrl || hub.cardUrl}
						<img
							src={hubImageUrl(hub.logoUrl || hub.cardUrl)}
							alt={`${hub.title ?? 'Hub'} image`}
							class="h-full w-full object-cover"
						/>
					{/if}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-surface-950">
						{hub.title ?? 'Untitled hub'}
					</p>
					<p class="line-clamp-1 text-xs text-surface-600">
						{hub.description ?? 'No description yet.'}
					</p>
				</div>
			</a>
		{/each}
	</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each hubs as hub}
			<a
				href={hubHref(hub)}
				class="group grid min-h-48 overflow-hidden rounded-lg border border-surface-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
				data-sveltekit-preload-data="hover"
			>
				<div class="relative h-28 overflow-hidden bg-surface-100">
					{#if hub.cardUrl}
						<img
							src={hubImageUrl(hub.cardUrl)}
							alt={`${hub.title ?? 'Hub'} card`}
							class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
						/>
					{:else}
						<div
							class="flex h-full w-full items-center justify-center bg-surface-100 text-sm font-medium text-surface-500"
						>
							Cover image unavailable
						</div>
					{/if}
				</div>
				<div class="space-y-3 p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-xs font-semibold uppercase text-primary-700">{hub.type ?? 'Hub'}</p>
							<h3 class="mt-1 truncate text-base font-semibold text-surface-950">
								{hub.title ?? 'Untitled hub'}
							</h3>
						</div>
						{#if hub.logoUrl}
							<img
								src={hubImageUrl(hub.logoUrl)}
								alt={`${hub.title ?? 'Hub'} logo`}
								class="h-10 w-10 rounded-full border border-surface-200 object-cover"
							/>
						{/if}
					</div>
					<p class="line-clamp-2 text-sm leading-relaxed text-surface-600">
						{hub.description ?? 'No description yet.'}
					</p>
				</div>
			</a>
		{/each}
	</div>
{/if}

<style>
	.line-clamp-1,
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-1 {
		line-clamp: 1;
		-webkit-line-clamp: 1;
	}

	.line-clamp-2 {
		line-clamp: 2;
		-webkit-line-clamp: 2;
	}
</style>
