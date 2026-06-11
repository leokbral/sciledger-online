<script lang="ts">
	import type { PageData } from './$types';
	import RoleBadge from '$lib/components/Roles/RoleBadge.svelte';
	import { getRoleLabel } from '$lib/helpers/roleDisplay';

	interface Props {
		data: PageData;
		form?: { success?: boolean; message?: string };
	}

	let { data, form }: Props = $props();

	function normalizeValue(value: any) {
		if (!value) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number') return String(value);
		if (value.id) return String(value.id);
		if (value._id) return String(value._id);
		return String(value);
	}

	function userValue(user: any) {
		return normalizeValue(user?.id) || normalizeValue(user?._id);
	}

	function userForId(userId: string) {
		const normalizedUserId = normalizeValue(userId);
		return data.users.find(
			(item: any) =>
				normalizeValue(item.id) === normalizedUserId || normalizeValue(item._id) === normalizedUserId
		);
	}

	function userLabel(userId: string) {
		const user = userForId(userId);
		if (!user) return userId;
		const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
		return name ? `${name} (${user.email})` : user.email || userId;
	}

	function roleName(roleKey: string | null | undefined) {
		const role = data.roles.find((item: any) => item.key === roleKey);
		return role?.name || getRoleLabel(roleKey);
	}

	function roleForKey(roleKey: string | null | undefined) {
		return data.roles.find((item: any) => item.key === roleKey);
	}

	function decorateAssignment(assignment: any) {
		const role = roleForKey(assignment.roleKey);
		return {
			...assignment,
			roleName: role?.name,
			priority: role?.priority
		};
	}

	function activeRoles() {
		return data.roles.filter((role: any) => role.isActive !== false && role.key !== 'ManagingEditor');
	}

	function roleLabels() {
		return Object.fromEntries(data.roles.map((role: any) => [role.key, role.name]));
	}

	function displayAssignmentsForUser(assignments: any[]) {
		return assignments.map(decorateAssignment);
	}

	function groupedAssignments() {
		const groups = new Map<string, { userId: string; assignments: any[] }>();

		for (const assignment of data.assignments) {
			const userId = normalizeValue(assignment.userId);
			if (!userId) continue;
			const group = groups.get(userId) ?? { userId, assignments: [] };
			group.assignments.push(assignment);
			groups.set(userId, group);
		}

		return Array.from(groups.values())
			.map((group) => ({
				...group,
				displayAssignments: displayAssignmentsForUser(group.assignments)
			}))
			.sort((left, right) => userLabel(left.userId).localeCompare(userLabel(right.userId)));
	}
</script>

<svelte:head>
	<title>Hub RBAC - SciLedger</title>
</svelte:head>

	{#if !data.authorized}
	<section class="mx-auto max-w-3xl py-12">
		<a href="/hub/view/{data.hub._id || data.hub.id}" class="text-sm text-primary-700">Back to hub</a>
		<h1 class="mt-4 text-2xl font-semibold text-slate-900">Hub RBAC</h1>
		<p class="mt-3 text-sm text-slate-600">You do not have permission to manage roles for this hub.</p>
	</section>
{:else}
	<section class="space-y-8">
		{#if form?.message || data.statusMessage}
			<div class="rounded border px-3 py-2 text-sm {(form?.success ?? !!data.statusMessage) ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}">
				{form?.message || data.statusMessage}
			</div>
		{/if}

		<header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
			<div>
				<a href="/hub/view/{data.hub._id || data.hub.id}" class="text-sm text-primary-700">Back to hub</a>
				<h1 class="mt-2 text-2xl font-semibold text-slate-950">Hub Roles</h1>
				<p class="text-sm text-slate-600">{data.hub.title}</p>
			</div>
			<form method="POST" action="?/restoreDefaultEditorialRoles" class="rounded border border-slate-200 bg-white p-3 shadow-sm">
				<p class="mb-2 text-xs text-slate-500">
					Restore Editor Chief, Associate Editor and Reviewer defaults.
				</p>
				<button class="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
					Restore Default Roles
				</button>
			</form>
		</header>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Roles</h2>
			<div class="grid gap-4 xl:grid-cols-2">
				{#each activeRoles() as role}
					<form
						method="POST"
						action="?/updateRolePermissions"
						class="rounded border border-slate-200 bg-white p-4 shadow-sm"
					>
						<input type="hidden" name="roleId" value={role.id || role._id} />
						<div class="mb-3 flex items-start justify-between gap-3">
							<div>
								<h3 class="text-base font-semibold text-slate-900">{role.name}</h3>
								<p class="text-xs text-slate-500">{role.key} · Priority {role.priority ?? 0}</p>
								{#if role.inheritsFrom?.length}
									<p class="text-xs text-slate-500">
										Inherits {role.inheritsFrom.map((roleKey: string) => roleName(roleKey)).join(', ')}
									</p>
								{/if}
							</div>
							{#if role.isProtected}
								<span class="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
									Protected
								</span>
							{:else if role.isSystem}
								<span class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">
									System
								</span>
							{/if}
						</div>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each data.permissions as permission}
								<label class="flex items-center gap-2 text-sm text-slate-700">
									<input
										type="checkbox"
										name="permissions"
										value={permission}
										checked={role.permissions?.includes(permission)}
										disabled={role.isProtected}
										class="rounded border-slate-300"
									/>
									<span>{permission}</span>
								</label>
							{/each}
						</div>
						<div class="mt-4 flex flex-wrap gap-2">
							<button
								class="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
								disabled={role.isProtected}
							>
								Save Permissions
							</button>
						</div>
					</form>
					{#if !role.isProtected}
						<form method="POST" action="?/deleteRole" class="-mt-3">
							<input type="hidden" name="roleId" value={role.id || role._id} />
							<button class="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">
								Remove Role
							</button>
						</form>
					{/if}
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Create Custom Role</h2>
			<form
				method="POST"
				action="?/createRole"
				class="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3"
			>
				<input name="key" placeholder="RoleKey" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<input name="name" placeholder="Role name" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<input name="description" placeholder="Description" class="rounded border border-slate-300 px-3 py-2 text-sm" />
				<div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 md:col-span-3">
					{#each data.permissions as permission}
						<label class="flex items-center gap-2 text-sm text-slate-700">
							<input type="checkbox" name="permissions" value={permission} class="rounded border-slate-300" />
							<span>{permission}</span>
						</label>
					{/each}
				</div>
				<button class="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white md:w-fit">
					Create Role
				</button>
			</form>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">Assignments</h2>
			<form
				method="POST"
				action="?/assignRole"
				class="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3"
			>
				<select name="userId" class="rounded border border-slate-300 px-3 py-2 text-sm">
					{#each data.users as user}
						<option value={userValue(user)}>{userLabel(userValue(user))}</option>
					{/each}
				</select>
				<select name="roleKey" class="rounded border border-slate-300 px-3 py-2 text-sm">
					{#each activeRoles() as role}
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
							<th class="px-3 py-2">Highest Role</th>
							<th class="px-3 py-2">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each groupedAssignments() as group}
							<tr class="border-b border-slate-100">
								<td class="px-3 py-2">{userLabel(group.userId)}</td>
								<td class="px-3 py-2">
									<RoleBadge assignments={group.displayAssignments} roleLabels={roleLabels()} />
								</td>
								<td class="px-3 py-2">
									<div class="flex flex-wrap gap-2">
										{#each group.assignments as assignment}
											<form method="POST" action="?/revokeAssignment">
												<input type="hidden" name="assignmentId" value={assignment.id || assignment._id} />
												<button class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
													Revoke {roleName(assignment.roleKey)}
												</button>
											</form>
										{/each}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold text-slate-900">RBAC Audit</h2>
			<div class="overflow-x-auto rounded border border-slate-200 bg-white">
				<table class="min-w-full text-left text-sm">
					<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th class="px-3 py-2">Date</th>
							<th class="px-3 py-2">User</th>
							<th class="px-3 py-2">Action</th>
							<th class="px-3 py-2">Role</th>
							<th class="px-3 py-2">Target</th>
						</tr>
					</thead>
					<tbody>
						{#each data.auditLogs as log}
							<tr class="border-b border-slate-100">
								<td class="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
								<td class="px-3 py-2">{log.userId ? userLabel(log.userId) : 'System'}</td>
								<td class="px-3 py-2">{log.action}</td>
								<td class="px-3 py-2">{log.roleKey || '-'}</td>
								<td class="px-3 py-2">{log.targetUserId ? userLabel(log.targetUserId) : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</section>
{/if}
