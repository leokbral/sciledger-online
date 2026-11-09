<script lang="ts">
	import { onMount } from 'svelte';
	import HubIdentityHeader from './HubIdentityHeader.svelte';
	import { fade, fly } from 'svelte/transition';
	import Icon from '@iconify/svelte';
	import SelectedHubWorkspace from '$lib/Pages/Hub/SelectedHubWorkspace.svelte';
	import ReviewerManagement from '$lib/components/ReviewerManagement/ReviewerManagement.svelte';
	import PapersSection from '$lib/components/PapersSection/PapersSection.svelte';
	import RoleBadge from '$lib/components/Roles/RoleBadge.svelte';
	import { getPrimaryRole } from '$lib/helpers/roleDisplay';
	import { getInitials } from '$lib/utils/GetInitials';

	let { data } = $props();

	const hub = data.hub;
	const memberRoleDefinitions = Array.isArray(data.memberRoleDefinitions)
		? data.memberRoleDefinitions
		: [];
	const effectiveHubMembers: any[] = Array.isArray(data.effectiveHubMembers)
		? data.effectiveHubMembers
		: [];
	const effectiveReviewers = Array.isArray(data.effectiveReviewers) ? data.effectiveReviewers : [];
	const currentUserHubMember = data.currentUserHubMember ?? null;
	const userId = data.user.id ?? data.user._id;
	const isCreator = currentUserHubMember?.primaryRoleKey === 'HubOwner';
	const isHubManager = data.isHubManager === true;
	const canManageRoles = data.canManageRoles === true;
	const isReviewer = data.isHubReviewer === true;

	let memberDashboardSearch = $state('');
	let memberDashboardFilter = $state<
		'all' | 'HubOwner' | 'EditorChief' | 'AssociateEditor' | 'Reviewer'
	>('all');
	let membersDrawerOpen = $state(false);

	function getValueAliases(value: any): string[] {
		if (!value) return [];
		if (typeof value === 'string' || typeof value === 'number') return [String(value)];
		if (typeof value !== 'object') return [];

		const aliases = [...getValueAliases(value.id), ...getValueAliases(value._id)];
		const stringified = value.toString?.();
		if (stringified && stringified !== '[object Object]') {
			aliases.push(String(stringified));
		}

		return Array.from(new Set(aliases.filter(Boolean)));
	}

	function userForId(memberUserId: string) {
		const aliases = new Set(getValueAliases(memberUserId));
		return data.users?.find((user: any) =>
			getValueAliases(user).some((alias) => aliases.has(alias))
		);
	}

	function memberName(member: any): string {
		if (!member) return 'Unknown user';
		return (
			`${member.firstName || ''} ${member.lastName || ''}`.trim() ||
			member.name ||
			member.email ||
			'Unknown user'
		);
	}

	function memberEmail(member: any): string {
		return member?.email || 'No email';
	}

	function memberAvatar(member: any): string {
		return member?.profilePictureUrl || member?.profilePicture || '';
	}

	function roleForKey(roleKey: string | null | undefined) {
		return memberRoleDefinitions.find((role: any) => role.key === roleKey);
	}

	function decorateAssignment(assignment: any) {
		const role = roleForKey(assignment.roleKey);
		return {
			...assignment,
			roleName: role?.name,
			priority: role?.priority
		};
	}

	function buildEffectiveMemberRow(entry: any) {
		const member = entry.user || userForId(entry.userId) || { _id: entry.userId, id: entry.userId };
		const assignments =
			Array.isArray(entry.roles) && entry.roles.length > 0
				? entry.roles.map((role: any) =>
						decorateAssignment({
							userId: entry.userId,
							roleKey: role.roleKey,
							roleName: role.name,
							priority: role.priority,
							isActive: true,
							scopeType: 'hub',
							scopeId: hub._id || hub.id
						})
					)
				: (entry.directRoleKeys || []).map((roleKey: string) =>
						decorateAssignment({
							userId: entry.userId,
							roleKey,
							isActive: true,
							scopeType: 'hub',
							scopeId: hub._id || hub.id
						})
					);

		return {
			id: entry.userId,
			sourceRole: 'assignment' as const,
			member,
			avatarUrl: memberAvatar(member),
			assignments
		};
	}

	function getAllHubMemberRows() {
		return effectiveHubMembers
			.map(buildEffectiveMemberRow)
			.sort((a, b) => memberName(a.member).localeCompare(memberName(b.member)));
	}

	function getHubMemberRows() {
		const term = memberDashboardSearch.trim().toLowerCase();
		return getAllHubMemberRows()
			.filter((row) => {
				if (memberDashboardFilter === 'all') return true;
				return getPrimaryRole(row.assignments) === memberDashboardFilter;
			})
			.filter((row) => {
				if (!term) return true;
				return (
					memberName(row.member).toLowerCase().includes(term) ||
					memberEmail(row.member).toLowerCase().includes(term)
				);
			});
	}

	function countMembersWithRole(roleKey: string) {
		return getAllHubMemberRows().filter((row) => getPrimaryRole(row.assignments) === roleKey)
			.length;
	}

	function countEditorialMembers() {
		const editorialRoles = new Set(['EditorChief', 'AssociateEditor']);
		return getAllHubMemberRows().filter((row) => {
			const primaryRole = getPrimaryRole(row.assignments);
			return !!primaryRole && editorialRoles.has(primaryRole);
		}).length;
	}

	function openMembersDrawer() {
		membersDrawerOpen = true;
	}

	function handleMembersRequested() {
		openMembersDrawer();
	}

	function closeMembersDrawer() {
		membersDrawerOpen = false;
	}

	function handleDrawerKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeMembersDrawer();
		}
	}

	onMount(() => {
		window.addEventListener('hub-members-requested', handleMembersRequested);

		return () => {
			window.removeEventListener('hub-members-requested', handleMembersRequested);
		};
	});

	// The server authorizes the list; SelectedHubWorkspace filters it for the active persona.
	const workspacePapers = Array.isArray(data.papers) ? data.papers : [];

	const isUserInvolved = (paper: any) => {
		return (
			paper.mainAuthor?.id === userId ||
			(paper.coAuthors &&
				Array.isArray(paper.coAuthors) &&
				paper.coAuthors.some((coAuthor: any) => coAuthor?.id === userId)) ||
			paper.correspondingAuthor?.id === userId ||
			paper.submittedBy?.id === userId
		);
	};

	const shouldHighlight = (paper: any) => {
		const isOwnerOrReviewer = isHubManager || isReviewer;
		return paper.status !== 'published' && (isUserInvolved(paper) || isOwnerOrReviewer);
	};

	// Real Hub-level statistics (computed once from loaded data -- no fabricated metrics).
	const allHubMemberRows = getAllHubMemberRows();
	const hubStats = {
		manuscripts: Array.isArray(data.papers) ? data.papers.length : workspacePapers.length,
		published: (Array.isArray(data.papers) ? data.papers : []).filter(
			(paper: any) => String(paper?.status ?? '').toLowerCase() === 'published'
		).length,
		members: allHubMemberRows.length,
		owners: countMembersWithRole('HubOwner'),
		editors: countEditorialMembers(),
		reviewers: effectiveReviewers.length || countMembersWithRole('Reviewer')
	};
	// Real counts forwarded to the role dashboards.
	const hubMemberStats = {
		members: hubStats.members,
		owners: hubStats.owners,
		editors: hubStats.editors,
		reviewers: hubStats.reviewers,
		pendingInvitations: Array.isArray(data.pendingPaperInvitations)
			? data.pendingPaperInvitations.length
			: 0
	};
	const identityStats: { label: string; value: number }[] = [
		{ label: 'Manuscripts', value: hubStats.manuscripts },
		{ label: 'Published', value: hubStats.published },
		{ label: 'Members', value: hubStats.members },
		{ label: 'Editors', value: hubStats.editors },
		{ label: 'Reviewers', value: hubStats.reviewers }
	];
</script>

<svelte:window onkeydown={handleDrawerKeydown} />

{#snippet hubManagementPanel()}
	{#if isHubManager || canManageRoles}
		<section id="reviewers" class="scroll-mt-28 border-t border-surface-200 pt-8">
			<div class="mb-5 max-w-3xl">
				<h2 class="text-lg font-semibold tracking-tight text-surface-950">Review Operations</h2>
				<p class="mt-1 text-sm leading-6 text-surface-600">
					Reviewer invitations and assignment controls for this Hub.
				</p>
			</div>
			<div class="space-y-3">
				{#if isHubManager}
					<a
						href="/hub/view/{hub._id || hub.id}/reviewer-invites"
						class="btn preset-tonal-primary inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary-500 px-4 py-2 text-sm font-semibold"
					>
						<Icon icon="mdi:email-search-outline" class="size-5" />
						Review Invitations
					</a>
					<ReviewerManagement
						hubId={hub._id}
						canManageHub={isHubManager}
						canInviteVice={canManageRoles}
						users={data.users as any[]}
						{effectiveReviewers}
					/>
				{/if}
			</div>
		</section>
	{/if}
{/snippet}

{#snippet hubMembersPanel()}
	<section class="flex h-full flex-col bg-white">
		<header class="border-b border-surface-200 px-6 py-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-[11px] font-medium uppercase tracking-wide text-surface-500">
						{hub.title}
					</p>
					<h2 class="mt-1.5 text-2xl font-semibold tracking-tight text-surface-950">Members</h2>
					<p class="mt-2 text-sm leading-6 text-surface-500">
						{getAllHubMemberRows().length} people with roles in this Hub.
					</p>
				</div>
				<button
					type="button"
					class="inline-flex h-9 w-9 items-center justify-center rounded-full text-surface-500 transition hover:bg-surface-100 hover:text-surface-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
					aria-label="Close members drawer"
					onclick={closeMembersDrawer}
				>
					<Icon icon="mdi:close" class="size-5" />
				</button>
			</div>
			<div class="relative mt-6">
				<Icon
					icon="mdi:magnify"
					class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400"
				/>
				<input
					type="text"
					bind:value={memberDashboardSearch}
					placeholder="Find a member..."
					class="w-full rounded-lg border border-surface-200 bg-surface-50 py-3 pl-9 pr-3 text-sm text-surface-800 transition placeholder:text-surface-400 hover:border-surface-300 focus:border-surface-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/15"
				/>
			</div>
		</header>

		<div class="flex flex-wrap items-center gap-1.5 border-b border-surface-100 px-6 py-4">
			<button
				type="button"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition {memberDashboardFilter ===
				'all'
					? 'bg-surface-950 text-white'
					: 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'}"
				onclick={() => (memberDashboardFilter = 'all')}>All</button
			>
			<button
				type="button"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition {memberDashboardFilter ===
				'HubOwner'
					? 'bg-surface-950 text-white'
					: 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'}"
				onclick={() => (memberDashboardFilter = 'HubOwner')}>Owners</button
			>
			<button
				type="button"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition {memberDashboardFilter ===
				'EditorChief'
					? 'bg-surface-950 text-white'
					: 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'}"
				onclick={() => (memberDashboardFilter = 'EditorChief')}>Editor Chief</button
			>
			<button
				type="button"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition {memberDashboardFilter ===
				'AssociateEditor'
					? 'bg-surface-950 text-white'
					: 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'}"
				onclick={() => (memberDashboardFilter = 'AssociateEditor')}>Associate Editor</button
			>
			<button
				type="button"
				class="rounded-full px-3 py-1.5 text-xs font-medium transition {memberDashboardFilter ===
				'Reviewer'
					? 'bg-surface-950 text-white'
					: 'text-surface-600 hover:bg-surface-100 hover:text-surface-950'}"
				onclick={() => (memberDashboardFilter = 'Reviewer')}>Reviewers</button
			>
		</div>

		<div class="flex-1 overflow-y-auto">
			{#if getHubMemberRows().length > 0}
				{#each getHubMemberRows() as row (row.id)}
					<div
						class="flex items-center gap-4 border-b border-surface-100 px-6 py-4 transition last:border-b-0 hover:bg-surface-50"
					>
						{#if row.avatarUrl}
							<img
								src={row.avatarUrl}
								alt={memberName(row.member)}
								class="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-surface-200"
							/>
						{:else}
							<div
								class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-100 text-sm font-semibold text-surface-600 ring-1 ring-surface-200"
							>
								{getInitials(
									row.member?.firstName || row.member?.name || 'M',
									row.member?.lastName || ''
								)}
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-surface-950">
								{memberName(row.member)}
							</p>
							<p class="mt-0.5 truncate text-xs text-surface-500">{memberEmail(row.member)}</p>
						</div>
						<div class="shrink-0">
							<RoleBadge assignments={row.assignments} />
						</div>
					</div>
				{/each}
			{:else}
				<div class="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
					<Icon icon="mdi:account-search-outline" class="size-9 text-surface-300" />
					<p class="text-sm font-medium text-surface-600">No members found</p>
					<p class="text-xs text-surface-400">Try a different search or filter.</p>
				</div>
			{/if}
		</div>
	</section>
{/snippet}

{#snippet hubWorkspacePanel(personaPapers: any[])}
	<section id="papers" class="scroll-mt-28">
		<PapersSection
			papers={personaPapers}
			{hub}
			{isCreator}
			{isHubManager}
			isHubReviewer={isReviewer}
			isPlatformAdmin={data.isPlatformAdmin === true}
			{effectiveReviewers}
			userId={data.user.id ?? data.user._id}
			{shouldHighlight}
			reviewAssignments={data.reviewAssignments}
			pendingPaperInvitations={data.pendingPaperInvitations}
		/>
	</section>
{/snippet}

<div class="mx-auto max-w-7xl space-y-8 pb-16 lg:space-y-10">
	<HubIdentityHeader {hub} {identityStats} />

	<SelectedHubWorkspace
		user={data.user}
		{hub}
		{currentUserHubMember}
		papers={workspacePapers}
		management={hubManagementPanel}
		workspace={hubWorkspacePanel}
		stats={hubMemberStats}
		isPlatformAdmin={data.isPlatformAdmin === true}
	/>
</div>

{#if membersDrawerOpen}
	<div class="fixed inset-0 z-50 flex justify-end">
		<button
			type="button"
			class="absolute inset-0 bg-surface-950/5 backdrop-blur-[1px]"
			aria-label="Close members drawer"
			onclick={closeMembersDrawer}
			transition:fade={{ duration: 120 }}
		></button>
		<aside
			class="relative h-full w-full max-w-lg border-l border-surface-200 bg-white shadow-2xl"
			aria-label="Hub members"
			transition:fly={{ x: 40, duration: 180 }}
		>
			{@render hubMembersPanel()}
		</aside>
	</div>
{/if}
