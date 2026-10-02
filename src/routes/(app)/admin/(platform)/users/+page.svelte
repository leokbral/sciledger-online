<script lang="ts">
	import AdminFilters from '$lib/components/Admin/AdminFilters.svelte';
	import AdminTable from '$lib/components/Admin/AdminTable.svelte';
	import StatusBadge from '$lib/components/Admin/StatusBadge.svelte';
	import { formatAdminDate, formatAdminLoginDate } from '$lib/helpers/adminFormat';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const columns = [
		'User',
		'Email',
		'Global roles',
		'Hubs',
		'Status',
		'Registered',
		'First recorded login',
		'Last login'
	] as const;
</script>

<svelte:head>
	<title>Users | SciLedger Administration</title>
</svelte:head>

<section class="space-y-4">
	<div>
		<h2 class="text-lg font-semibold text-slate-900">Users</h2>
		<p class="mt-1 text-sm text-slate-600">
			Search by name, username, e-mail or ORCID iD. Credentials and tokens are never loaded.
		</p>
	</div>

	<AdminFilters search={data.users.search} placeholder="Name, username, e-mail or ORCID iD" />
	<p class="text-sm text-slate-500">
		Login times are shown in Brasília time (America/Sao_Paulo). Older accounts may have incomplete
		login history; the first recorded login is the earliest available record.
	</p>

	<AdminTable
		{columns}
		items={data.users.items}
		page={data.users.page}
		pageCount={data.users.pageCount}
		total={data.users.total}
		pageSize={data.users.pageSize}
		emptyTitle="No users found"
		emptyMessage="No account matches this search."
	>
		{#snippet row(user)}
			<td class="px-4 py-3">
				<a
					href={`/admin/users/${user.id}`}
					class="font-medium text-primary-700 hover:text-primary-800"
				>
					{user.name}
				</a>
				{#if user.username}
					<p class="text-xs text-slate-500">@{user.username}</p>
				{/if}
			</td>
			<td class="px-4 py-3">
				<p class="text-slate-700">{user.email}</p>
				{#if !user.emailVerified}
					<p class="text-xs font-medium text-amber-700">Unverified</p>
				{/if}
			</td>
			<td class="px-4 py-3">
				{#if user.globalRoles.length === 0}
					<span class="text-xs text-slate-400">—</span>
				{:else}
					<div class="flex flex-wrap gap-1">
						{#each user.globalRoles as roleKey}
							<span
								class="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
							>
								{roleKey}
							</span>
						{/each}
					</div>
				{/if}
			</td>
			<td class="px-4 py-3 text-slate-600">{user.hubRoleCount}</td>
			<td class="px-4 py-3"><StatusBadge status={user.billingStatus} /></td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">{formatAdminDate(user.createdAt)}</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminLoginDate(user.firstLoginAt)}
			</td>
			<td class="whitespace-nowrap px-4 py-3 text-slate-500">
				{formatAdminLoginDate(user.lastLoginAt)}
			</td>
		{/snippet}
	</AdminTable>
</section>
