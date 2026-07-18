<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { DashboardUser } from '$lib/components/Dashboard/types';
	import { getHubMetrics } from './hubMetrics';
	import { resolveHubWorkspaceForHub } from './hubResolver';
	import type { HubRoleContext, HubStats, HubSummary, HubWorkspacePersonaKey } from './hubTypes';
	import type { HubWorkspacePaper, HubWorkspaceReview } from './hubTypes';
	import AdminWorkspace from './workspaces/Admin/AdminWorkspace.svelte';
	import AuthorWorkspace from './workspaces/Author/AuthorWorkspace.svelte';
	import EditorWorkspace from './workspaces/Editor/EditorWorkspace.svelte';
	import ReaderWorkspace from './workspaces/Reader/ReaderWorkspace.svelte';
	import ReviewerWorkspace from './workspaces/Reviewer/ReviewerWorkspace.svelte';

	type WorkspaceUser = DashboardUser & {
		id?: string | null;
		_id?: string | null;
	};

	interface Props {
		user: WorkspaceUser;
		hub: HubSummary;
		currentUserHubMember?: HubRoleContext;
		papers?: HubWorkspacePaper[];
		reviews?: HubWorkspaceReview[];
		details?: Snippet;
		members?: Snippet;
		management?: Snippet;
		workspace?: Snippet;
		stats?: HubStats;
	}

	let {
		user,
		hub,
		currentUserHubMember,
		papers = [],
		reviews = [],
		details,
		members,
		management,
		workspace,
		stats
	}: Props = $props();

	let contextualHub = $derived({
		...hub,
		currentUserHubMember: currentUserHubMember ?? hub.currentUserHubMember
	} satisfies HubSummary);
	let hubs = $derived([contextualHub]);
	let metrics = $derived(getHubMetrics(hubs, papers, reviews));
	let currentUserId = $derived(String(user.id ?? user._id ?? ''));
	let resolution = $derived(
		resolveHubWorkspaceForHub(contextualHub, currentUserHubMember, {
			userId: currentUserId,
			papers
		})
	);
	let availablePersonas = $derived(resolution.availablePersonas);
	let selectedPersonaKey = $state<HubWorkspacePersonaKey | null>(null);
	let activePersona = $derived(
		availablePersonas.find((persona) => persona.key === selectedPersonaKey) ?? availablePersonas[0]
	);
	const loading = false;
	const error = null;

	$effect(() => {
		const nextDefault = availablePersonas[0]?.key ?? 'Reader';
		if (
			!selectedPersonaKey ||
			!availablePersonas.some((persona) => persona.key === selectedPersonaKey)
		) {
			selectedPersonaKey = nextDefault;
		}
	});

	function handlePersonaChange(event: Event) {
		selectedPersonaKey = (event.currentTarget as HTMLSelectElement).value as HubWorkspacePersonaKey;
	}
</script>

<section class="space-y-6">
	<div
		class="flex flex-col gap-4 border-b border-surface-200 pb-5 sm:flex-row sm:items-end sm:justify-between"
	>
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-500">Workspace</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight text-surface-950">
				{activePersona?.label ?? resolution.label}
			</h2>
		</div>

		{#if availablePersonas.length > 1}
			<label class="relative inline-flex w-full max-w-xs items-center sm:w-auto">
				<span class="sr-only">Workspace</span>
				<span
					class="pointer-events-none absolute left-3 text-[11px] font-semibold uppercase tracking-wide text-surface-500"
				>
					Workspace
				</span>
				<select
					value={activePersona?.key}
					onchange={handlePersonaChange}
					class="h-11 w-full appearance-none rounded-full border border-surface-200 bg-white pl-24 pr-10 text-sm font-semibold text-surface-950 shadow-sm transition hover:border-surface-300 focus:border-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15 sm:min-w-64"
				>
					{#each availablePersonas as persona (persona.key)}
						<option value={persona.key}>{persona.label}</option>
					{/each}
				</select>
				<Icon
					icon="mdi:chevron-down"
					class="pointer-events-none absolute right-3 size-5 text-surface-400"
				/>
			</label>
		{:else}
			<div
				class="inline-flex w-fit items-center gap-2 rounded-full border border-surface-200 bg-white px-4 py-2 text-sm font-semibold text-surface-700 shadow-sm"
			>
				<span class="text-[11px] uppercase tracking-wide text-surface-500">Workspace</span>
				<span>{activePersona?.label ?? resolution.label}</span>
			</div>
		{/if}
	</div>

	{#key activePersona?.key}
		{#if activePersona?.role === 'admin'}
			<AdminWorkspace
				{user}
				hub={contextualHub}
				hubRoleLabel={activePersona.label}
				{hubs}
				{papers}
				{reviews}
				{metrics}
				{loading}
				{error}
				{details}
				{members}
				{management}
				{workspace}
				{stats}
			/>
		{:else if activePersona?.role === 'editor'}
			<EditorWorkspace
				{user}
				hub={contextualHub}
				hubRoleLabel={activePersona.label}
				{hubs}
				{papers}
				{reviews}
				{metrics}
				{loading}
				{error}
				{details}
				{members}
				{management}
				{workspace}
				{stats}
			/>
		{:else if activePersona?.role === 'reviewer'}
			<ReviewerWorkspace
				{user}
				hub={contextualHub}
				hubRoleLabel={activePersona.label}
				{hubs}
				{papers}
				{reviews}
				{metrics}
				{loading}
				{error}
				{details}
				{workspace}
				{stats}
			/>
		{:else if activePersona?.role === 'author'}
			<AuthorWorkspace
				{user}
				hub={contextualHub}
				hubRoleLabel={activePersona.label}
				{hubs}
				{papers}
				{reviews}
				{metrics}
				{loading}
				{error}
				{details}
				{workspace}
				{stats}
			/>
		{:else}
			<ReaderWorkspace
				{user}
				hub={contextualHub}
				hubRoleLabel={activePersona?.label ?? resolution.label}
				{hubs}
				{papers}
				{reviews}
				{metrics}
				{loading}
				{error}
				{details}
				{workspace}
				{stats}
			/>
		{/if}
	{/key}
</section>
