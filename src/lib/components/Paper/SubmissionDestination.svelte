<script lang="ts">
	import type { SubmissionHub } from '$lib/types/SubmissionHub';
	import { hubImageUrl } from '$lib/Pages/Hub/hubMetrics';

	let { hub, compact = false }: { hub: SubmissionHub | null; compact?: boolean } = $props();
</script>

<section
	aria-label="Submission destination"
	class="w-full overflow-hidden rounded-xl border {hub
		? 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20'
		: 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800'}"
>
	{#if hub && !compact && (hub.bannerUrl || hub.cardUrl)}
		<div class="h-24 overflow-hidden bg-primary-100 sm:h-32" aria-hidden="true">
			<img
				src={hubImageUrl(hub.bannerUrl || hub.cardUrl)}
				alt=""
				class="h-full w-full object-cover"
			/>
		</div>
	{/if}
	<div class="flex items-start gap-4 {compact ? 'p-4' : 'p-5 sm:p-6'}">
		<div
			class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-surface-200 bg-white text-primary-700"
		>
			{#if hub?.logoUrl}
				<img
					src={hubImageUrl(hub.logoUrl)}
					alt={`${hub.title} logo`}
					class="h-full w-full object-contain p-1"
				/>
			{:else if hub}
				<span class="text-xl font-bold" aria-hidden="true"
					>{hub.title.trim().slice(0, 2).toUpperCase()}</span
				>
			{:else}
				<svg
					width="26"
					height="26"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
					><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path
						d="M14 2v6h6M8 13h8M8 17h6"
					/></svg
				>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<p
				class="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300"
			>
				{hub ? 'Hub submission' : 'Standalone submission'}
			</p>
			<h2
				class="mt-1 break-words text-lg font-semibold leading-snug text-surface-950 dark:text-surface-50"
			>
				{hub ? hub.title : 'Independent paper on SciLedger'}
			</h2>
			{#if !compact}
				<p class="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
					{hub
						? `Your paper will be submitted to this ${hub.type.toLowerCase()}.`
						: 'This paper is being submitted independently, without a Hub.'}
				</p>
				{#if hub}
					<a
						href="/hub/view/{encodeURIComponent(hub.id)}?public=1"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-3 inline-block text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
						>View Hub details ↗</a
					>
				{/if}
			{/if}
		</div>
	</div>
</section>
