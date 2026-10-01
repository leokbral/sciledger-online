<script lang="ts">
	import AdminStatCard from '$lib/components/Admin/AdminStatCard.svelte';
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import { formatAdminDate, formatAdminDateTime, truncate } from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Administration | SciLedger</title>
</svelte:head>

<section class="space-y-4">
	<h2 class="text-lg font-semibold text-slate-900">Platform totals</h2>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<AdminStatCard label="Users" value={data.counts.users} />
		<AdminStatCard label="Hubs" value={data.counts.hubs} />
		<AdminStatCard
			label="Papers"
			value={data.counts.papers}
			hint={`${data.counts.publishedPapers.toLocaleString('en-US')} published · ${data.counts.declinedPapers.toLocaleString('en-US')} declined`}
		/>
		<AdminStatCard
			label="Reviews"
			value={data.counts.reviewAssignments}
			hint={`${data.counts.submittedReviews.toLocaleString('en-US')} submitted or completed`}
		/>
	</div>
	<div class="grid gap-4 sm:grid-cols-2">
		<AdminStatCard
			label="Pending invitations"
			value={data.counts.pendingInvitations}
			hint="Reviewer invitations awaiting a response"
		/>
		<a href="/admin/papers?status=declined" class="block rounded-xl transition hover:opacity-80">
			<AdminStatCard
				label="Declined papers"
				value={data.counts.declinedPapers}
				hint="Declined by a hub or rejected editorially — open the filtered list"
			/>
		</a>
	</div>
</section>

<div class="grid gap-6 xl:grid-cols-2">
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Recent users</h2>
			<a href="/admin/users" class="text-sm font-medium text-primary-700 hover:text-primary-800">
				View all
			</a>
		</div>

		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			{#if data.recentUsers.length === 0}
				<p class="px-6 py-10 text-center text-sm text-slate-600">No users yet.</p>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.recentUsers as user}
						<li class="flex items-center justify-between gap-4 px-4 py-3">
							<div class="min-w-0">
								<a
									href={`/admin/users/${user.id}`}
									class="block truncate text-sm font-medium text-primary-700 hover:text-primary-800"
								>
									{user.name}
								</a>
								<p class="truncate text-xs text-slate-500">{user.email}</p>
							</div>
							<div class="flex flex-none items-center gap-3">
								{#if !user.emailVerified}
									<span class="text-xs font-medium text-amber-700">Unverified</span>
								{/if}
								<span class="text-xs text-slate-500">{formatAdminDate(user.createdAt)}</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Recent papers</h2>
			<a href="/admin/papers" class="text-sm font-medium text-primary-700 hover:text-primary-800">
				View all
			</a>
		</div>

		<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			{#if data.recentPapers.length === 0}
				<p class="px-6 py-10 text-center text-sm text-slate-600">No papers yet.</p>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each data.recentPapers as paper}
						<li class="px-4 py-3">
							<div class="flex items-start justify-between gap-3">
								<p class="min-w-0 text-sm font-medium text-slate-900">
									{truncate(paper.title, 70)}
								</p>
								<StatusBadge status={paper.status} override={paper.declined ? 'declined' : null} />
							</div>
							<p class="mt-1 text-xs text-slate-500">
								{paper.author ?? 'Unknown author'} · {formatAdminDate(paper.createdAt)}
							</p>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</div>

<section class="space-y-3">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-slate-900">Recent administrative activity</h2>
		<a href="/admin/activity" class="text-sm font-medium text-primary-700 hover:text-primary-800">
			View all
		</a>
	</div>

	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		{#if data.recentAdminActivity.length === 0}
			<p class="px-6 py-10 text-center text-sm text-slate-600">
				No administrative activity recorded yet.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-slate-200 bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								Action
							</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								Actor
							</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								Resource
							</th>
							<th class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
								When
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.recentAdminActivity as event}
							<tr class="hover:bg-slate-50">
								<td class="px-4 py-3 font-mono text-xs text-slate-700">{event.action}</td>
								<td class="px-4 py-3 text-slate-700">{event.actor ?? '—'}</td>
								<td class="px-4 py-3 text-slate-600">
									{event.resourceType}
									<span class="text-slate-400">·</span>
									<span class="font-mono text-xs">{truncate(event.resourceId, 24)}</span>
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-500">
									{formatAdminDateTime(event.createdAt)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
