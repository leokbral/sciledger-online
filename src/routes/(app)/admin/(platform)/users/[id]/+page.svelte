<script lang="ts">
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import {
		formatAdminDate,
		formatAdminDateTime,
		formatAdminLoginDate,
		truncate
	} from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let profile = $derived(data.profile);
</script>

<svelte:head>
	<title>{profile.name} | SciLedger Administration</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/admin/users" class="text-sm font-medium text-primary-700 hover:text-primary-800">
			Back to users
		</a>
		<h2 class="mt-2 text-xl font-semibold text-slate-950">{profile.name}</h2>
		<p class="mt-1 text-sm text-slate-600">
			{profile.email}
			{#if profile.username}
				<span class="text-slate-400">·</span> @{profile.username}
			{/if}
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<div class="space-y-6">
			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-base font-semibold text-slate-900">Roles</h3>

				<div class="mt-4 space-y-4">
					<div>
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Global</p>
						{#if profile.globalRoles.length === 0}
							<p class="mt-1 text-sm text-slate-600">No global roles.</p>
						{:else}
							<ul class="mt-2 space-y-2">
								{#each profile.globalRoles as role}
									<li class="flex flex-wrap items-center gap-2 text-sm">
										<span
											class="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800"
										>
											{role.roleKey}
										</span>
										<span class="text-xs text-slate-500">
											granted {formatAdminDate(role.createdAt)}
											{#if role.grantedBy}
												by <span class="font-mono">{role.grantedBy}</span>
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div>
						<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Hub scoped</p>
						{#if profile.hubRoles.length === 0}
							<p class="mt-1 text-sm text-slate-600">No hub roles.</p>
						{:else}
							<ul class="mt-2 space-y-2">
								{#each profile.hubRoles as role}
									<li class="flex flex-wrap items-center gap-2 text-sm">
										<span
											class="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800"
										>
											{role.roleKey}
										</span>
										<a
											href={`/hub/view/${role.hubId}`}
											class="text-sm text-primary-700 hover:text-primary-800"
										>
											{role.hubTitle ?? role.hubId}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			</section>

			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-base font-semibold text-slate-900">Review assignments</h3>
				<p class="mt-1 text-sm text-slate-600">Ten most recent, operational fields only.</p>

				{#if profile.reviewAssignments.length === 0}
					<p class="mt-4 text-sm text-slate-600">This account has no review assignments.</p>
				{:else}
					<div class="mt-4 overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead class="border-b border-slate-200">
								<tr>
									<th class="py-2 pr-4 text-xs font-semibold uppercase text-slate-500">Paper</th>
									<th class="py-2 pr-4 text-xs font-semibold uppercase text-slate-500">Hub</th>
									<th class="py-2 pr-4 text-xs font-semibold uppercase text-slate-500">Status</th>
									<th class="py-2 text-xs font-semibold uppercase text-slate-500">Deadline</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-100">
								{#each profile.reviewAssignments as assignment}
									<tr>
										<td class="py-2 pr-4 text-slate-700">
											{truncate(assignment.paperTitle ?? assignment.paperId, 48)}
										</td>
										<td class="py-2 pr-4 text-slate-600">{assignment.hubTitle ?? '—'}</td>
										<td class="py-2 pr-4"><StatusBadge status={assignment.status} /></td>
										<td class="whitespace-nowrap py-2 text-slate-500">
											{formatAdminDate(assignment.deadline)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</section>

			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-base font-semibold text-slate-900">Recent activity</h3>

				{#if profile.recentActivity.length === 0}
					<p class="mt-4 text-sm text-slate-600">No activity recorded for this account.</p>
				{:else}
					<ul class="mt-4 divide-y divide-slate-100">
						{#each profile.recentActivity as event}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
								<span class="font-mono text-xs text-slate-700">{event.action}</span>
								<span class="text-xs text-slate-500">{formatAdminDateTime(event.createdAt)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>

		<aside class="space-y-4">
			<section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="text-base font-semibold text-slate-900">Account</h3>
				<dl class="mt-4 space-y-3 text-sm">
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">User id</dt>
						<dd class="mt-0.5 break-all font-mono text-xs text-slate-700">{profile.id}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">ORCID iD</dt>
						<dd class="mt-0.5 text-slate-700">{profile.orcid ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Institution
						</dt>
						<dd class="mt-0.5 text-slate-700">{profile.institution || '—'}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</dt>
						<dd class="mt-0.5 text-slate-700">{profile.position || '—'}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							E-mail verified
						</dt>
						<dd class="mt-0.5 text-slate-700">{profile.emailVerified ? 'Yes' : 'No'}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing</dt>
						<dd class="mt-1"><StatusBadge status={profile.billingStatus} /></dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Papers</dt>
						<dd class="mt-0.5 text-slate-700">{profile.paperCount}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
						<dd class="mt-0.5 text-slate-700">{formatAdminDate(profile.createdAt)}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
							First recorded login
						</dt>
						<dd class="mt-0.5 text-slate-700">{formatAdminLoginDate(profile.firstLoginAt)}</dd>
					</div>
					<div>
						<dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Last login</dt>
						<dd class="mt-0.5 text-slate-700">{formatAdminLoginDate(profile.lastLoginAt)}</dd>
					</div>
				</dl>
				<p class="mt-4 text-xs text-slate-500">
					Login times use Brasília time (America/Sao_Paulo). The first recorded login is the
					earliest available record; older accounts may have incomplete login history.
				</p>
			</section>

			<section class="rounded-xl border border-blue-200 bg-blue-50 p-5">
				<p class="text-sm leading-6 text-blue-900">
					This view is read-only. Role changes stay in the hub RBAC screens, and super administrator
					access is granted only by the platform bootstrap script.
				</p>
			</section>
		</aside>
	</div>
</div>
