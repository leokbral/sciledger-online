<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { hubImageUrl } from './hubMetrics';
	let {
		hub,
		identityStats = []
	}: { hub: any; identityStats?: { label: string; value: number }[] } = $props();
	let openCalendarModal = $state(false);
	let openAcknowledgementModal = $state(false);
	let hubCoverImageIndex = $state(0);
	let hubCoverImages = $derived([hub.bannerUrl, hub.cardUrl].filter(Boolean));
	let hubCoverImage = $derived(hubCoverImages[hubCoverImageIndex] || '');
	let hasAcknowledgement = $derived(
		!!(hub.acknowledgement && hub.acknowledgement.replace(/<[^>]*>/g, '').trim())
	);
	function handleHubCoverError() {
		hubCoverImageIndex += 1;
	}
	function formatDate(value: string | Date) {
		return new Date(value).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
	function foundedYear(value: string | Date | null | undefined) {
		if (!value) return '';
		const year = new Date(value).getFullYear();
		return Number.isNaN(year) ? '' : String(year);
	}
	function socialHref(base: string, value: string) {
		return /^https?:\/\//i.test(value) ? value : `${base}${value}`;
	}
</script>

<section class="rounded-xl border border-surface-200 bg-white shadow-sm">
	<div class="relative h-56 w-full overflow-hidden rounded-t-xl sm:h-72 lg:h-80">
		{#if hubCoverImage}
			<img
				src={hubImageUrl(hubCoverImage)}
				alt={`${hub.title ?? 'Hub'} cover`}
				class="h-full w-full object-cover"
				onerror={handleHubCoverError}
			/>
		{:else}
			<div
				class="flex h-full w-full items-center justify-center bg-surface-100 text-sm font-medium text-surface-500"
			>
				Cover image unavailable
			</div>
		{/if}
	</div>

	<div class="px-5 pb-8 sm:px-8">
		<div class="relative z-10 -mt-14">
			<div
				class="h-32 w-32 overflow-hidden rounded-2xl border-[6px] border-white bg-surface-100 shadow-sm ring-1 ring-surface-200 sm:h-36 sm:w-36"
			>
				{#if hub.logoUrl || hub.cardUrl}
					<img
						src={hubImageUrl(hub.logoUrl || hub.cardUrl)}
						alt={`${hub.title} logo`}
						class="h-full w-full object-cover"
					/>
				{:else}
					<div
						class="flex h-full w-full items-center justify-center bg-primary-100 text-lg font-bold text-primary-700"
					>
						{hub.title?.substring(0, 2).toUpperCase() ?? 'HB'}
					</div>
				{/if}
			</div>
		</div>

		<div class="mt-5 max-w-5xl">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-4xl font-bold tracking-tight text-surface-950 md:text-5xl">
					{hub.title}
				</h1>
				{#if hub.type}
					<span
						class="rounded-full bg-surface-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-surface-600"
					>
						{hub.type}
					</span>
				{/if}
			</div>
		</div>

		{#if hub.description}
			<p class="mt-4 max-w-4xl text-base leading-relaxed text-surface-700">
				{hub.description}
			</p>
		{/if}

		<div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-surface-500">
			{#if hub.location}
				<span class="inline-flex items-center gap-1.5">
					<Icon icon="material-symbols-light:location-on-outline" class="size-4" />
					{hub.location}
				</span>
			{/if}
			{#if hub.issn}
				<span class="inline-flex items-center gap-1.5">
					<Icon icon="mdi:identifier" class="size-4" />
					ISSN {hub.issn}
				</span>
			{/if}
			{#if foundedYear(hub.createdAt)}
				<span class="inline-flex items-center gap-1.5">
					<Icon icon="mdi:calendar-blank-outline" class="size-4" />
					Since {foundedYear(hub.createdAt)}
				</span>
			{/if}
		</div>

		<div class="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-surface-100 pt-6">
			{#each identityStats as item (item.label)}
				<div>
					<p class="text-2xl font-semibold leading-none text-surface-950">{item.value}</p>
					<p class="mt-1.5 text-xs font-medium uppercase tracking-wide text-surface-500">
						{item.label}
					</p>
				</div>
			{/each}
		</div>

		{#if hub.guidelinesUrl || hub.dates || hasAcknowledgement || hub.socialMedia}
			<div class="mt-6 flex flex-wrap items-center gap-2">
				{#if hub.guidelinesUrl}
					<a
						href={hub.guidelinesUrl}
						target="_blank"
						class="btn inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
					>
						<Icon icon="mdi:file-document-outline" class="size-5" />
						Guidelines
					</a>
				{/if}

				{#if hub.dates}
					<Modal
						open={openCalendarModal}
						onOpenChange={(event) => (openCalendarModal = event.open)}
						triggerBase="btn inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
						contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
						backdropClasses="backdrop-blur-sm"
					>
						{#snippet trigger()}
							<span class="inline-flex items-center gap-2">
								<Icon icon="mdi:calendar-outline" class="size-5" />Calendar
							</span>
						{/snippet}
						{#snippet content()}
							<header class="border-b border-surface-200 pb-4">
								<h2 class="text-2xl font-semibold text-surface-900">Important Dates</h2>
							</header>
							<article class="space-y-4 text-surface-800">
								{#if hub.dates.submissionStart}
									<div class="border-l-4 border-primary-500 pl-4">
										<p class="font-medium">Submission Start Date</p>
										<p class="text-sm text-surface-600">
											{formatDate(hub.dates.submissionStart)}
										</p>
									</div>
								{/if}
								{#if hub.dates.submissionEnd}
									<div class="border-l-4 border-amber-500 pl-4">
										<p class="font-medium">Submission Deadline</p>
										<p class="text-sm text-surface-600">{formatDate(hub.dates.submissionEnd)}</p>
									</div>
								{/if}
								{#if hub.dates.eventStart}
									<div class="border-l-4 border-emerald-500 pl-4">
										<p class="font-medium">Event Start Date</p>
										<p class="text-sm text-surface-600">{formatDate(hub.dates.eventStart)}</p>
									</div>
								{/if}
								{#if hub.dates.eventEnd}
									<div class="border-l-4 border-red-500 pl-4">
										<p class="font-medium">Event End Date</p>
										<p class="text-sm text-surface-600">{formatDate(hub.dates.eventEnd)}</p>
									</div>
								{/if}
							</article>
						{/snippet}
					</Modal>
				{/if}

				{#if hasAcknowledgement}
					<Modal
						open={openAcknowledgementModal}
						onOpenChange={(event) => (openAcknowledgementModal = event.open)}
						triggerBase="btn inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
						contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
						backdropClasses="backdrop-blur-sm"
					>
						{#snippet trigger()}Acknowledgement{/snippet}
						{#snippet content()}
							<div class="prose prose-sm max-w-none text-surface-800">
								{@html hub.acknowledgement}
							</div>
						{/snippet}
					</Modal>
				{/if}

				{#if hub.socialMedia}
					<div class="ml-auto flex flex-wrap items-center gap-3">
						{#if hub.socialMedia.website}
							<a
								href={hub.socialMedia.website}
								target="_blank"
								class="text-surface-500 hover:text-blue-600"
							>
								<Icon icon="mdi:web" class="size-5" />
							</a>
						{/if}
						{#if hub.socialMedia.twitter}
							<a
								href={socialHref('https://twitter.com/', hub.socialMedia.twitter)}
								target="_blank"
								class="text-surface-500 hover:text-black"
							>
								<Icon icon="ri:twitter-x-fill" class="size-5" />
							</a>
						{/if}
						{#if hub.socialMedia.facebook}
							<a
								href={socialHref('https://facebook.com/', hub.socialMedia.facebook)}
								target="_blank"
								class="text-surface-500 hover:text-blue-700"
							>
								<Icon icon="mdi:facebook" class="size-5" />
							</a>
						{/if}
						{#if hub.socialMedia.instagram}
							<a
								href={socialHref('https://instagram.com/', hub.socialMedia.instagram)}
								target="_blank"
								class="text-surface-500 hover:text-pink-600"
							>
								<Icon icon="mdi:instagram" class="size-5" />
							</a>
						{/if}
						{#if hub.socialMedia.linkedin}
							<a
								href={socialHref('https://linkedin.com/in/', hub.socialMedia.linkedin)}
								target="_blank"
								class="text-surface-500 hover:text-blue-700"
							>
								<Icon icon="mdi:linkedin" class="size-5" />
							</a>
						{/if}
						{#if hub.socialMedia.youtube}
							<a
								href={socialHref('https://youtube.com/', hub.socialMedia.youtube)}
								target="_blank"
								class="text-surface-500 hover:text-red-600"
							>
								<Icon icon="mdi:youtube" class="size-5" />
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
