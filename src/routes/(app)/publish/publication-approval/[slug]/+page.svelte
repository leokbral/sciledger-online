<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Paper } from '$lib/types/Paper';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let paper = data.paper as unknown as Paper;

	let expanded: Record<string, boolean> = $state({});
	let isApproving = $state(false);
	let isRejecting = $state(false);
	let actionError = $state('');
	let doi = $state('');

	function toggle(reviewId: string) {
		expanded[reviewId] = !expanded[reviewId];
	}

	function expandAll() {
		const reviews = ((paper as any)?.peer_review?.reviews ?? []) as any[];
		const next: Record<string, boolean> = {};
		for (const r of reviews) {
			const id = r?.id || r?._id;
			if (id) next[id] = true;
		}
		expanded = next;
	}

	function collapseAll() {
		expanded = {};
	}

	function recommendationLabel(rec: string) {
		const map: Record<string, string> = {
			accept_without_changes: 'Accept (no changes)',
			accept_with_minor_revisions: 'Accept (minor revisions)',
			major_revision: 'Major revision',
			reject: 'Reject'
		};
		return map[rec] || rec || '—';
	}

	function badgeClass(rec: string) {
		if (rec === 'accept_without_changes') return 'bg-green-100 text-green-800 border-green-200';
		if (rec === 'accept_with_minor_revisions') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
		if (rec === 'major_revision') return 'bg-amber-100 text-amber-900 border-amber-200';
		if (rec === 'reject') return 'bg-red-100 text-red-800 border-red-200';
		return 'bg-slate-100 text-slate-700 border-slate-200';
	}

	// Group reviews by round: 1 = round 1, 2 = round 2 (reviewRound may be 2 or 3 depending on schema)
	function reviewsByRound(roundNum: 1 | 2) {
		const list = (((paper as any)?.peer_review?.reviews ?? []) as any[]);
		return list.filter((r: any) => {
			const rr = r?.reviewRound ?? r?.round;
			if (roundNum === 1) return rr === 1;
			return rr === 2 || rr === 3; // treat 2 or 3 as the second round
		});
	}

	async function approve() {
		const trimmedDoi = doi?.trim();
		if (trimmedDoi && !/^10\.\S+\/\S+$/i.test(trimmedDoi)) {
			actionError = 'Invalid DOI format. Use pattern starting with 10.xxxx/xxxxx.';
			return;
		}
		const ok = confirm(`Approve this paper${trimmedDoi ? ` with DOI "${trimmedDoi}"` : ''}?`);
		if (!ok) return;
		isApproving = true;
		actionError = '';
		try {
			const resp = await fetch(`/api/papers/${(paper as any).id}/approve-publication`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ doi: trimmedDoi || undefined })
			});
			const result = await resp.json();
			if (!resp.ok) {
				actionError = result.error || 'Failed to approve publication';
				return;
			}
			await goto(`/publish/published/${(paper as any).id}`);
		} catch (e) {
			console.error(e);
			actionError = 'Network error. Please try again.';
		} finally {
			isApproving = false;
		}
	}

	async function reject() {
		const ok = confirm('Reject publication and send the paper back to author corrections?');
		if (!ok) return;
		isRejecting = true;
		actionError = '';
		try {
			const resp = await fetch(`/api/papers/${(paper as any).id}/reject-publication`, { method: 'POST' });
			const result = await resp.json();
			if (!resp.ok) {
				actionError = result.error || 'Failed to reject publication';
				return;
			}
			await goto(`/publish/negotiation/${(paper as any).id}`);
		} catch (e) {
			console.error(e);
			actionError = 'Network error. Please try again.';
		} finally {
			isRejecting = false;
		}
	}
</script>

<div class="mx-auto max-w-7xl px-3 md:px-6 py-6">
	<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
		<div>
			<h1 class="text-2xl md:text-3xl font-semibold text-slate-900">Publication approval</h1>
			<p class="text-slate-600 mt-1">
				Review the article + peer reviews, then approve or reject publication.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<div class="flex flex-col gap-1 text-sm">
				<label class="text-slate-700 font-medium">DOI (opcional)</label>
				<input
					type="text"
					class="w-52 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
					placeholder="10.xxxx/xxxxx"
					bind:value={doi}
				/>
			</div>
			<button
				class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
				onclick={() => goto('/publish/negotiation/' + (paper as any).id)}
			>
				Back
			</button>
			<button
				class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
				onclick={expandAll}
			>
				Expand all reviews
			</button>
			<button
				class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
				onclick={collapseAll}
			>
				Collapse all
			</button>
			<button
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
				disabled={isApproving || isRejecting}
				onclick={approve}
			>
				{isApproving ? 'Approving…' : 'Approve'}
			</button>
			<button
				class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
				disabled={isApproving || isRejecting}
				onclick={reject}
			>
				{isRejecting ? 'Rejecting…' : 'Reject'}
			</button>
		</div>
	</div>

	{#if actionError}
		<div class="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
			{actionError}
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<section class="lg:col-span-7">
			<div class="rounded-xl border border-slate-200 bg-white shadow-sm">
				<div class="p-4 md:p-6 border-b border-slate-100">
					<h2 class="text-xl font-semibold text-slate-900">{@html (paper as any)?.title || ''}</h2>
					<div class="mt-2 flex flex-wrap gap-2">
						<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
							Status: {(paper as any).status}
						</span>
						<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
							Round: {(paper as any).reviewRound}
						</span>
						{#if (paper as any)?.hubId?.title}
							<span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
								Hub: {(paper as any).hubId.title}
							</span>
						{/if}
					</div>
				</div>

				<div class="p-4 md:p-6">
					<h3 class="text-sm font-semibold text-slate-800">Abstract</h3>
					<div class="mt-2 prose max-w-none text-slate-800">{@html (paper as any)?.abstract || ''}</div>

					<h3 class="mt-6 text-sm font-semibold text-slate-800">Full article</h3>
					<div class="mt-2 prose max-w-none text-slate-800">{@html (paper as any)?.content || ''}</div>
				</div>
			</div>

		</section>
		<section class="lg:col-span-5">
			<div class="rounded-xl border border-slate-200 bg-white shadow-sm p-4 md:p-6">
				<h3 class="text-base font-semibold text-slate-900 mb-4">Peer reviews</h3>
				<div class="space-y-6">
					{#if reviewsByRound(1).length}
						<h4 class="text-sm font-semibold text-slate-700">Round 1</h4>
						<div class="space-y-3">
							{#each reviewsByRound(1) as review, idx1 (review.id || review._id || `r1-${idx1}`)}
								{@const rid = (review.id || review._id || `r1-${idx1}`)}
								<div class="rounded-lg border border-slate-200 overflow-hidden">
									<button class="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3" onclick={() => toggle(rid)}>
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<span class="font-medium text-slate-900">{review?.reviewerId?.firstName} {review?.reviewerId?.lastName}</span>
												<span class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClass(review?.recommendation)}`}>{recommendationLabel(review?.recommendation)}</span>
												<span class="text-xs text-slate-600">Avg: {review?.averageScore ?? '—'} | Weighted: {review?.weightedScore ?? '—'}</span>
											</div>
										</div>
										<span class="text-slate-500 text-sm">{expanded[rid] ? '−' : '+'}</span>
									</button>
									{#if expanded[rid]}
										<div class="px-4 py-4 bg-white">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<h5 class="text-sm font-semibold text-slate-800">Strengths</h5>
													<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{review?.qualitativeEvaluation?.strengths || '—'}</p>
												</div>
												<div>
													<h5 class="text-sm font-semibold text-slate-800">Weaknesses</h5>
													<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{review?.qualitativeEvaluation?.weaknesses || '—'}</p>
												</div>
											</div>
											<div class="mt-4">
												<h5 class="text-sm font-semibold text-slate-800">Scores</h5>
												<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
													{#each Object.entries(review?.quantitativeEvaluation ?? {}) as [k, v] (k)}
														<div class="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
															<span class="text-slate-700 capitalize">{k}</span>
															<span class="font-medium text-slate-900">{v}</span>
														</div>
													{/each}
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if reviewsByRound(2).length}
						<h4 class="text-sm font-semibold text-slate-700">Round 2</h4>
						<div class="space-y-3">
							{#each reviewsByRound(2) as review, idx2 (review.id || review._id || `r2-${idx2}`)}
								{@const rid = (review.id || review._id || `r2-${idx2}`)}
								<div class="rounded-lg border border-slate-200 overflow-hidden">
									<button class="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3" onclick={() => toggle(rid)}>
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<span class="font-medium text-slate-900">{review?.reviewerId?.firstName} {review?.reviewerId?.lastName}</span>
												<span class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badgeClass(review?.recommendation)}`}>{recommendationLabel(review?.recommendation)}</span>
												<span class="text-xs text-slate-600">Avg: {review?.averageScore ?? '—'} | Weighted: {review?.weightedScore ?? '—'}</span>
											</div>
										</div>
										<span class="text-slate-500 text-sm">{expanded[rid] ? '−' : '+'}</span>
									</button>
									{#if expanded[rid]}
										<div class="px-4 py-4 bg-white">
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<h5 class="text-sm font-semibold text-slate-800">Strengths</h5>
													<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{review?.qualitativeEvaluation?.strengths || '—'}</p>
												</div>
												<div>
													<h5 class="text-sm font-semibold text-slate-800">Weaknesses</h5>
													<p class="mt-1 whitespace-pre-wrap text-sm text-slate-700">{review?.qualitativeEvaluation?.weaknesses || '—'}</p>
												</div>
											</div>
											<div class="mt-4">
												<h5 class="text-sm font-semibold text-slate-800">Scores</h5>
												<div class="mt-2 grid grid-cols-2 gap-2 text-sm">
													{#each Object.entries(review?.quantitativeEvaluation ?? {}) as [k, v] (k)}
														<div class="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
															<span class="text-slate-700 capitalize">{k}</span>
															<span class="font-medium text-slate-900">{v}</span>
														</div>
													{/each}
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					{#if !reviewsByRound(1).length && !reviewsByRound(2).length}
						<div class="text-sm text-slate-600">No reviews found.</div>
					{/if}
				</div>
			</div>
		</section>
	</div>
	</div>
