<script lang="ts">
	import AdminFilters from '$lib/components/Admin/AdminFilters.svelte';
	import AdminTable from '$lib/components/Admin/AdminTable.svelte';
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import { formatAdminDate, truncate } from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const columns = [
		'Paper',
		'Reviewer',
		'Hub',
		'Assignment',
		'Review',
		'Assigned',
		'Deadline',
		'Completed'
	] as const;
</script>

<svelte:head>
	<title>Reviews | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">Reviews</h2>
		<p class="mt-1 text-sm text-slate-600">
			Operational view of review assignments: who is reviewing what, in which hub, and against which
			deadline.
		</p>
	</div>

	<div class="rounded-xl border border-blue-200 bg-blue-50 p-5">
		<p class="text-sm leading-6 text-blue-900">
			Scientific content is deliberately out of scope here. Scores, recommendations, qualitative
			assessments and attachments are not loaded by this screen, and platform administration gives
			no ability to alter the content of a review.
		</p>
	</div>

	<AdminFilters
		search={data.reviews.search}
		placeholder="Paper title, DOI or reviewer"
		statuses={data.statuses}
		selectedStatus={data.status}
		statusLabel="Assignment status"
	/>

	<AdminTable
		{columns}
		items={data.reviews.items}
		page={data.reviews.page}
		pageCount={data.reviews.pageCount}
		total={data.reviews.total}
		pageSize={data.reviews.pageSize}
		emptyTitle="No review assignments found"
		emptyMessage="No review assignment matches these filters."
	>
		{#snippet row(review)}
			<td class="px-4 py-3">
				<a
					href={`/publish/view/${review.paperId}`}
					class="font-medium text-primary-700 hover:text-primary-800"
				>
					{truncate(review.paperTitle ?? review.paperId, 44)}
				</a>
				<p class="mt-1">
					<StatusBadge
						status={review.paperStatus}
						override={review.paperDeclined ? 'declined' : null}
					/>
				</p>
			</td>
			<td class="px-4 py-3">
				{#if review.reviewerId}
					<a
						href={`/admin/users/${review.reviewerId}`}
						class="text-primary-700 hover:text-primary-800"
					>
						{review.reviewer ?? review.reviewerId}
					</a>
				{:else}
					<span class="text-xs text-slate-400">—</span>
				{/if}
			</td>
			<td class="px-4 py-3 text-slate-600">
				{#if review.hubId}
					<a href={`/hub/view/${review.hubId}`} class="text-primary-700 hover:text-primary-800">
						{truncate(review.hubTitle ?? review.hubId, 24)}
					</a>
				{:else}
					<span class="text-xs text-slate-500">No hub</span>
				{/if}
			</td>
			<td class="px-4 py-3"><StatusBadge status={review.status} /></td>
			<td class="px-4 py-3">
				<StatusBadge status={review.reviewStatus} fallback="Not started" />
				{#if review.reviewRound}
					<p class="mt-1 text-xs text-slate-500">Round {review.reviewRound}</p>
				{/if}
			</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500"
				>{formatAdminDate(review.assignedAt)}</td
			>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">{formatAdminDate(review.deadline)}</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminDate(review.completedAt)}
			</td>
		{/snippet}
	</AdminTable>
</section>
