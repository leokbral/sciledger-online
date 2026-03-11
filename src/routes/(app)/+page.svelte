<script lang="ts">
	import { page } from '$app/stores';
	import PaperList from '$lib/PaperList/index.svelte';
	import { page_size } from '$lib/constants';
	import type { PageData } from './$types';

	interface HubShowcaseItem {
		_id: string;
		id: string;
		title: string;
		type: string;
		description: string;
		status: string;
		logoUrl: string;
		bannerUrl: string;
		cardUrl: string;
		publishedCount: number;
		recentPapers: Array<{ id: string; title: string; createdAt: string }>;
	}

	type HubImageCandidate = {
		primary: string;
		fallback: string;
	};

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let papers = data.papers;
	let hubShowcase: HubShowcaseItem[] = (data.hubShowcase as HubShowcaseItem[]) ?? [];

	let tags: string[] = [];

	let p = $derived(+($page.url.searchParams.get('page') ?? '1'));
	let tag = $derived($page.url.searchParams.get('tag'));
	let tab = $derived($page.url.searchParams.get('tab') ?? 'all');
	let page_link_base = $derived(tag ? `tag=${tag}` : `tab=${tab}`);

	function normalizeImageValue(value: string): string {
		return value.trim().replace(/^['"]|['"]$/g, '');
	}

	function getHubImageCandidate(hub: HubShowcaseItem): HubImageCandidate | null {
		const raw = normalizeImageValue(hub.bannerUrl || hub.cardUrl || hub.logoUrl || '');
		if (!raw) return null;

		if (/^(https?:\/\/|data:|blob:)/i.test(raw) || raw.startsWith('/api/images/')) {
			return { primary: raw, fallback: '' };
		}

		const normalizedId = raw.replace(/^\/+/, '');
		const fallback = `/api/images/${normalizedId}`;

		if (raw.startsWith('/')) {
			return { primary: raw, fallback };
		}

		return { primary: fallback, fallback: '' };
	}

	function handleHubImageError(event: Event) {
		const img = event.currentTarget as HTMLImageElement | null;
		if (!img) return;

		const fallback = img.dataset.fallbackSrc || '';
		if (fallback && img.src !== new URL(fallback, window.location.origin).href) {
			img.src = fallback;
			img.dataset.fallbackSrc = '';
			return;
		}

		img.style.display = 'none';
		const fallbackBox = img.parentElement?.querySelector('.hub-image-fallback') as HTMLElement | null;
		if (fallbackBox) fallbackBox.style.display = 'flex';
	}
</script>

<div class="space-y-10">
	<section class="hub-hero relative overflow-hidden rounded-2xl border border-surface-200 p-6 md:p-8">
		<div class="pointer-events-none absolute -top-24 -right-24 h-52 w-52 rounded-full bg-primary-200/70 blur-3xl"></div>
		<div class="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-secondary-200/60 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-3">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Public Hubs Directory</p>
			<h2 class="text-2xl md:text-4xl font-semibold text-surface-900 leading-tight max-w-4xl">
				Discover each hub, its focus, and recently published articles
			</h2>
			<p class="text-surface-700 max-w-3xl">
				Browse hub profiles and published research in one place.
			</p>
		</div>
	</section>

	<section class="space-y-4">
		{#if hubShowcase.length > 0}
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
				{#each hubShowcase as hub, index}
					{@const imageCandidate = getHubImageCandidate(hub)}
					<article class="hub-card rounded-2xl border border-surface-200 bg-white/95 p-5 md:p-6 shadow-sm hover:shadow-lg transition-all duration-300" style={`animation-delay: ${Math.min(index * 70, 420)}ms`}>
						<div class="hub-media mb-4 overflow-hidden rounded-xl border border-surface-200 bg-surface-100">
							{#if imageCandidate}
								<img
									src={imageCandidate.primary}
									data-fallback-src={imageCandidate.fallback}
									alt={`Image of ${hub.title}`}
									class="h-36 w-full object-cover"
									loading="lazy"
									onerror={handleHubImageError}
								/>
								<div class="hub-image-fallback h-36 w-full bg-gradient-to-br from-primary-100 via-surface-50 to-secondary-100 items-center justify-center" style="display:none;">
									<span class="text-sm font-semibold uppercase tracking-[0.12em] text-surface-600">{hub.type}</span>
								</div>
							{:else}
								<div class="h-36 w-full bg-gradient-to-br from-primary-100 via-surface-50 to-secondary-100 flex items-center justify-center">
									<span class="text-sm font-semibold uppercase tracking-[0.12em] text-surface-600">{hub.type}</span>
								</div>
							{/if}
						</div>

						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-xs uppercase tracking-[0.14em] text-primary-700 font-semibold">{hub.type}</p>
								<h3 class="mt-1 text-lg md:text-xl font-semibold text-surface-900 truncate">{hub.title}</h3>
							</div>
							<span class="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
								{hub.publishedCount} published
							</span>
						</div>

						<p class="mt-3 text-sm text-surface-700 leading-relaxed whitespace-pre-line">
							{hub.description}
						</p>

						<div class="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
							<p class="text-xs font-semibold uppercase tracking-[0.12em] text-surface-600 mb-3">Recent articles</p>
							{#if hub.recentPapers.length > 0}
								<ul class="space-y-2">
									{#each hub.recentPapers as article}
										<li class="flex items-start gap-2">
											<span class="mt-[6px] h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0"></span>
											<a
												href={`/articles/${article.id}`}
												class="text-sm text-surface-800 hover:text-primary-700 transition-colors line-clamp-2"
											>
												{article.title}
											</a>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-sm text-surface-500">No published articles yet.</p>
							{/if}
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<div class="rounded-2xl border border-dashed border-surface-300 bg-surface-50 p-8 text-center">
				<p class="text-lg font-medium text-surface-800">No hubs with published articles yet.</p>
				<p class="mt-2 text-surface-600">As soon as hubs publish papers, they will appear here publicly.</p>
			</div>
		{/if}
	</section>

	<div class="container page max-w-[900px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9 w-full">
				<h4 class="h4 px-1 text-primary-500 font font-semibold">Published Articles</h4>
				<hr class="mt-2 mb-4 border-t-2!" />
				<PaperList {papers} />
			</div>
		</div>
	</div>
</div>

<style>
	.hub-hero {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(239, 246, 255, 0.95) 100%);
	}

	.hub-card {
		opacity: 0;
		transform: translateY(10px);
		animation: revealCard 450ms ease-out forwards;
	}

	@keyframes revealCard {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

</style>
