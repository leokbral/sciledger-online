<script lang="ts">
	import type { PageData } from './$types';
	import {
		getPermissionLabel,
		getRoleCapabilityProfile,
		groupPermissionsForDisplay
	} from '$lib/helpers/permissionDisplay';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function userLabel(userId: string) {
		const user = data.users.find((item: any) => item.id === userId || item._id === userId);
		if (!user) return userId;
		const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
		return name ? `${name} (${user.email})` : user.email || userId;
	}

	function hubLabel(hubId: string | null | undefined) {
		if (!hubId) return 'Global';
		const hub = data.hubs.find((item: any) => item.id === hubId || item._id === hubId);
		return hub ? `${hub.title} (${hub.type})` : hubId;
	}

	function roleName(roleKey: string | null | undefined) {
		const role = data.roles.find((item: any) => item.key === roleKey);
		return role?.name || roleKey || 'Role';
	}

	function permissionGroups() {
		return groupPermissionsForDisplay(data.permissions);
	}
</script>

<svelte:head>
	<title>RBAC Admin - SciLedger</title>
</svelte:head>

{#if !data.authorized}
	<section class="mx-auto max-w-3xl py-12">
		<h1 class="text-2xl font-semibold text-slate-900">RBAC</h1>
		<p class="mt-3 text-sm text-slate-600">You do not have permission to manage roles.</p>
	</section>
{:else}
	<section class="space-y-8">
		<header class="flex flex-col gap-2 border-b border-slate-200 pb-4">
			<h1 class="text-2xl font-semibold text-slate-950">Platform RBAC</h1>
			<p class="text-sm text-slate-600">Manage global platform roles. Hub roles are managed inside each hub.</p>
		</header>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Roles</h2>
			<div class="grid gap-4 xl:grid-cols-2">
				{#each data.roles as role}
					{@const profile = getRoleCapabilityProfile(role)}
					<form
						method="POST"
						action="?/updateRolePermissions"
						class="rounded border border-slate-200 bg-white p-4 shadow-sm"
					>
						<input type="hidden" name="roleKey" value={role.key} />
						<div class="mb-3 flex items-start justify-between gap-3">
							<div>
								<h3 class="text-base font-semibold text-slate-900">{role.name}</h3>
								<p class="text-sm text-slate-600">{profile.summary}</p>
							</div>
							<span class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">
								{role.isActive ? 'Active' : 'Inactive'}
							</span>
						</div>
						<div class="space-y-4">
							{#each permissionGroups() as group}
								<div class="space-y-2">
									<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
										{group.label}
									</p>
									<div class="grid gap-2 sm:grid-cols-2">
										{#each group.permissions as permission}
											<label class="flex items-center gap-2 text-sm text-slate-700">
												<input
													type="checkbox"
													name="permissions"
													value={permission}
													checked={role.permissions?.includes(permission)}
													class="rounded border-slate-300"
												/>
												<span>{getPermissionLabel(permission)}</span>
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>
						<button class="mt-4 rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
							Save Permissions
						</button>
					</form>
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Create Role</h2>
			<form method="POST" action="?/createRole" class="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
				<input name="key" placeholder="Role key" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<input name="name" placeholder="Role name" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<input name="description" placeholder="Description" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<div class="space-y-4 md:col-span-3">
					{#each permissionGroups() as group}
						<div class="space-y-2">
							<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
							<div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
								{#each group.permissions as permission}
									<label class="flex items-center gap-2 text-sm text-slate-700">
										<input
											type="checkbox"
											name="permissions"
											value={permission}
											class="rounded border-slate-300"
										/>
										<span>{getPermissionLabel(permission)}</span>
									</label>
								{/each}
							</div>
						</div>
					{/each}
				</div>
				<button class="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white md:w-fit">
					Create Role
				</button>
			</form>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Assignments</h2>
			<form method="POST" action="?/assignRole" class="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
				<select name="userId" class="rounded border border-slate-300 px-3 py-2 text-sm">
					{#each data.users as user}
						<option value={user.id}>{userLabel(user.id)}</option>
					{/each}
				</select>
				<select name="roleKey" class="rounded border border-slate-300 px-3 py-2 text-sm">
					{#each data.roles as role}
						<option value={role.key}>{role.name}</option>
					{/each}
				</select>
				<button class="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
					Assign Role
				</button>
			</form>

			<div class="overflow-x-auto rounded border border-slate-200 bg-white">
				<table class="min-w-full text-left text-sm">
					<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th class="px-3 py-2">User</th>
							<th class="px-3 py-2">Role</th>
							<th class="px-3 py-2">Scope</th>
							<th class="px-3 py-2">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each data.assignments as assignment}
							<tr class="border-b border-slate-100">
								<td class="px-3 py-2">{userLabel(assignment.userId)}</td>
								<td class="px-3 py-2">{roleName(assignment.roleKey)}</td>
								<td class="px-3 py-2">{assignment.scopeType}: {hubLabel(assignment.scopeId)}</td>
								<td class="px-3 py-2">
									<form method="POST" action="?/revokeAssignment">
										<input type="hidden" name="assignmentId" value={assignment.id || assignment._id} />
										<button class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
											Revoke
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Audit</h2>
			<div class="overflow-x-auto rounded border border-slate-200 bg-white">
				<table class="min-w-full text-left text-sm">
					<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th class="px-3 py-2">Date</th>
							<th class="px-3 py-2">User</th>
							<th class="px-3 py-2">Action</th>
							<th class="px-3 py-2">Paper</th>
							<th class="px-3 py-2">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.auditLogs as log}
							<tr class="border-b border-slate-100">
								<td class="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
								<td class="px-3 py-2">{log.userId ? userLabel(log.userId) : 'System'}</td>
								<td class="px-3 py-2">{log.action}</td>
								<td class="px-3 py-2">{log.paperId || '-'}</td>
								<td class="px-3 py-2">{log.previousStatus || '-'} -> {log.newStatus || '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</section>
{/if}
