<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { getInitials } from '$lib/utils/GetInitials';
	import ReviewerManagement from '$lib/components/ReviewerManagement/ReviewerManagement.svelte';
	import type { Paper } from '$lib/types/Paper.js';
	import PapersSection from '$lib/components/PapersSection/PapersSection.svelte';
	import ManageReviewerDeadline from '$lib/components/ReviewerManagement/ManageReviewerDeadline.svelte';
	import { normalizeId } from '$lib/helpers/hubPermissions';

	let { data } = $props();
	const hub = data.hub;
	const papers = data.papers;

	// Enhanced debug logging
	// console.log('Current Hub ID:', hub._id);
	// console.log('Papers before filtering:', papers?.length);

	// Filter papers to only show ones that belong to this hub and are published
	// const filteredPapers = papers?.filter((paper) => {
	// 	return paper.hubId === hub._id && paper.status === 'published';
	// });
	const userId = data.user._id;
	const isCreator = normalizeId(data.hub.createdBy) === data.user.id;
	const isViceManager = data.isViceManager === true ||
		(Array.isArray(hub.assistantManagers) && hub.assistantManagers.some((m: any) => normalizeId(m) === data.user.id));
	const isHubManager = isCreator || isViceManager;
	const isReviewer = Array.isArray(hub.reviewers)
		? hub.reviewers.some((r: any) => normalizeId(r) === data.user.id)
		: false;

	const owner = hub.createdBy;
	const assistantManagers = Array.isArray(hub.assistantManagers)
		? hub.assistantManagers.filter((m: any) => normalizeId(m))
		: [];
	const assistantManagerIds = new Set(assistantManagers.map((m: any) => normalizeId(m)));
	const reviewersOnly = Array.isArray(hub.reviewers)
		? hub.reviewers.filter((r: any) => {
			const id = normalizeId(r);
			if (!id) return false;
			if (assistantManagerIds.has(id)) return false;
			if (normalizeId(owner) === id) return false;
			return true;
		})
		: [];

	let memberDashboardSearch = $state('');
	let memberDashboardFilter = $state<'all' | 'owner' | 'vice' | 'reviewer'>('all');

	function memberName(member: any): string {
		if (!member) return 'Unknown user';
		return `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.name || member.email || 'Unknown user';
	}

	function memberEmail(member: any): string {
		return member?.email || 'No email';
	}

	function memberAvatar(member: any): string {
		return member?.profilePictureUrl || member?.profilePicture || '';
	}

	function getHubMemberRows() {
		const rows: Array<{ id: string; role: 'owner' | 'vice' | 'reviewer'; member: any; avatarUrl: string }> = [];
		const ownerId = normalizeId(owner) || 'owner';
		rows.push({ id: ownerId, role: 'owner', member: owner, avatarUrl: memberAvatar(owner) });

		assistantManagers.forEach((m: any) => {
			const id = normalizeId(m);
			if (id && id !== ownerId) {
				rows.push({ id, role: 'vice', member: m, avatarUrl: memberAvatar(m) });
			}
		});

		reviewersOnly.forEach((r: any) => {
			const id = normalizeId(r);
			if (id && id !== ownerId) {
				rows.push({ id, role: 'reviewer', member: r, avatarUrl: memberAvatar(r) });
			}
		});

		const term = memberDashboardSearch.trim().toLowerCase();
		return rows
			.filter((row) => memberDashboardFilter === 'all' || row.role === memberDashboardFilter)
			.filter((row) => {
				if (!term) return true;
				return (
					memberName(row.member).toLowerCase().includes(term) ||
					memberEmail(row.member).toLowerCase().includes(term)
				);
			})
			.sort((a, b) => memberName(a.member).localeCompare(memberName(b.member)));
	}

	let expandedPapers = $state<string[]>([]);

	let creatingAssignments = $state(false);

	async function createMissingAssignments() {
		creatingAssignments = true;
		try {
			const response = await fetch(`/api/hubs/${hub._id}/create-review-assignments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (response.ok) {
				alert(`✅ Created ${result.created} review assignments!`);
				window.location.reload();
			} else {
				alert(`❌ Error: ${result.error}`);
			}
		} catch (error) {
			console.error('Error creating assignments:', error);
			alert('❌ Failed to create assignments');
		} finally {
			creatingAssignments = false;
		}
	}

	const filteredPapers = data.papers?.filter((paper) => {
		console.log(`🔍 Filtering paper: ${paper.title}`);
		console.log(`   - status: ${paper.status}`);
		console.log(`   - isCreator: ${isCreator}`);
		console.log(`   - isReviewer (hub): ${isReviewer}`);
		console.log(`   - isAcceptedForReview: ${paper.isAcceptedForReview}`);
		
		// Se for published, todos podem ver
		if (paper.status === 'published') {
			console.log(`   ✅ Showing (published)`);
			return true;
		}

		// Se for criador do hub, pode ver todos os papers do hub (exceto drafts que já são filtrados no servidor)
		if (isCreator) {
			console.log(`   ✅ Showing (creator)`);
			return true;
		}

		// Se for revisor do hub, pode ver todos os papers do hub
		if (isReviewer) {
			console.log(`   ✅ Showing (hub reviewer)`);
			return true;
		}

		// Verificar se o usuário é revisor deste paper específico
		const hasAcceptedReview = paper.isAcceptedForReview || false;
		if (hasAcceptedReview) {
			console.log(`   ✅ Showing (paper reviewer)`);
			return true;
		}

		// Caso contrário, só vê se estiver envolvido no paper como autor
		const isMainAuthor = paper.mainAuthor?.id === userId;
		const isCoAuthor = paper.coAuthors?.some((ca: any) => ca.id === userId);
		const isCorresponding = paper.correspondingAuthor?.id === userId;
		const isSubmittedBy = paper.submittedBy?.id === userId;

		if (isMainAuthor || isCoAuthor || isCorresponding || isSubmittedBy) {
			console.log(`   ✅ Showing (author)`);
			return true;
		}

		console.log(`   ❌ Hidden`);
		return false;
	});

	console.log('Papers after filtering:', filteredPapers);

	let openCalendarModal = $state(false);
	let openAcknowledgementModal = $state(false);

	function closeAllModals() {
		openCalendarModal = false;
		openAcknowledgementModal = false;
	}

	// Accept any paper-like object with the expected fields
	const isUserInvolved = (paper: any) => {
		const userId = data.user.id;
		return (
			paper.mainAuthor?.id === userId ||
			(paper.coAuthors &&
				Array.isArray(paper.coAuthors) &&
				paper.coAuthors.some((c: any) => c?.id === userId)) ||
			paper.correspondingAuthor?.id === userId ||
			paper.submittedBy?.id === userId
		);
	};

	// console.log('Quem foi o responsavel foi esse',data.hub.createdBy._id);
	// console.log('Is creator:', isCreator);
	const shouldHighlight = (paper: any) => {
		const isOwnerOrReviewer = isHubManager || isReviewer;
		return paper.status !== 'published' && (isUserInvolved(paper) || isOwnerOrReviewer);
	};
</script>

<!-- Banner -->
<!-- <div class="w-full h-80 rounded-2xl overflow-hidden relative">
	{#if hub.bannerUrl}
		<img src={`/api/images/${hub.bannerUrl}`} alt="Banner" class="w-full h-full object-cover" />
	{:else}
		<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">Sem banner</div>
	{/if}
</div> -->

<!-- Card -->
<div class="w-full h-80 rounded-2xl overflow-hidden relative">
	{#if hub.cardUrl}
		<img src={`/api/images/${hub.cardUrl}`} alt="Card" class="w-full h-full object-cover" />
	{:else}
		<div class="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-semibold">
			{hub.title}
		</div>
	{/if}
</div>

<!-- Cabeçalho com logo -->
<div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
	{#if hub.logoUrl}
		<img
			src={`/api/images/${hub.logoUrl}`}
			alt="Logo"
			class="w-28 h-28 object-contain rounded-full"
		/>
	{:else}
		<div class="w-28 h-28 bg-primary-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
			{hub.title.substring(0, 2).toUpperCase()}
		</div>
	{/if}
	<div class="flex-1 flex flex-col justify-between min-h-full">
		<!-- Top section with title, guidelines, and edit button -->
		<div class="flex justify-between items-start">
			<div class="space-y-2">
				<h1 class="text-2xl font-semibold text-gray-900">
					{hub.title} <span class="text-sm text-gray-500 font-normal">{hub.type}</span>
				</h1>

				<!-- Localização -->
				{#if hub.location}
					<div class="flex items-center gap-2 text-gray-600 text-sm mt-2">
						<Icon icon="material-symbols-light:location-on-outline" width="24" height="24" />
						<span>{hub.location}</span>
					</div>
				{/if}

				<!-- ISSN -->
				{#if hub.issn}
					<div class="flex items-center gap-2 text-gray-600 text-sm mt-2">
						<span>ISSN: {hub.issn}</span>
					</div>
				{/if}
			</div>

			<!-- Guidelines and Edit Button -->
			<div class="flex items-center gap-4">
				{#if hub.guidelinesUrl}
					<a
						href={hub.guidelinesUrl}
						target="_blank"
						class="inline-flex items-center gap-2 rounded-full border border-surface-300 dark:border-surface-600 bg-white/95 dark:bg-surface-800 px-4 py-2 text-sm font-medium text-blue-700 dark:text-white shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
					>
						<Icon icon="mdi:file-document-outline" width="24" height="24" />
						<span>Guidelines</span>
					</a>
				{/if}
				
				{#if isCreator}
					<a
						href="/hub/edit/{hub._id}"
						class="btn inline-flex items-center gap-2 rounded-full border border-surface-300 dark:border-surface-600 bg-white/95 dark:bg-surface-800 px-4 py-2 text-surface-800 dark:text-surface-100 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
					>
						<Icon icon="mdi:pencil" width="20" />
						Edit Hub
					</a>
				{/if}
			</div>
		</div>

		<!-- Description -->
		{#if hub.description}
			<p class="text-gray-700 mt-4">{hub.description}</p>
		{/if}

		<!-- Rest of the content -->
		<!-- Datas -->
		<div class="flex justify-end gap-4 mt-6">
			{#if hub.dates}
				<Modal
					open={openCalendarModal}
					onOpenChange={(e) => (openCalendarModal = e.open)}
					triggerBase="btn inline-flex items-center gap-2 rounded-full border border-surface-300 dark:border-surface-600 bg-white/95 dark:bg-surface-800 px-4 py-2 text-surface-800 dark:text-surface-100 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
					contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
					backdropClasses="backdrop-blur-sm"
				>
					{#snippet trigger()}
						<h2 class="flex items-center gap-2 text-gray-800 dark:text-white">
							<Icon icon="mdi:calendar-outline" width="24" height="24" />Calendar
						</h2>
					{/snippet}
					{#snippet content()}
						<header class="flex justify-between border-b pb-4 mb-6">
							<h2 class="text-2xl font-semibold text-gray-800">Important Dates</h2>
						</header>
						<article class="flex flex-col gap-6 text-gray-800 px-2">
							<div class="flex items-center gap-4 border-l-4 border-primary-500 pl-4">
								<Icon icon="mdi:calendar-start" class="text-primary-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Submission Start Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.submissionStart).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-yellow-500 pl-4">
								<Icon icon="mdi:calendar-end" class="text-yellow-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Submission Deadline</p>
									<p class="text-gray-600">
										{new Date(hub.dates.submissionEnd).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-green-500 pl-4">
								<Icon icon="mdi:calendar-start" class="text-green-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Event Start Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.eventStart).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-red-500 pl-4">
								<Icon icon="mdi:calendar-end" class="text-red-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Event End Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.eventEnd).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>
						</article>
					{/snippet}
				</Modal>
			{/if}

			<!-- Ações -->
			{#if hub.acknowledgement && hub.acknowledgement.replace(/<[^>]*>/g, '').trim()}
				<Modal
					open={openAcknowledgementModal}
					onOpenChange={(e) => (openAcknowledgementModal = e.open)}
					triggerBase="btn inline-flex items-center gap-2 rounded-full border border-surface-300 dark:border-surface-600 bg-white/95 dark:bg-surface-800 px-4 py-2 text-surface-800 dark:text-surface-100 shadow-sm hover:bg-surface-50 dark:hover:bg-surface-700 hover:shadow-md transition-all"
					contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
					backdropClasses="backdrop-blur-sm"
				>
					{#snippet trigger()}Acknowledgement{/snippet}
					{#snippet content()}
						<article>
							<div class="prose prose-sm text-gray-800 max-w-none">{@html hub.acknowledgement}</div>
						</article>
					{/snippet}
				</Modal>
			{/if}
		</div>

		<!-- Social Media Icons -->
		{#if hub.socialMedia}
			<div class="flex flex-wrap gap-3">
				{#if hub.socialMedia.website}
					<a
						href={hub.socialMedia.website}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:web" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.twitter}
					<a
						href={`https://twitter.com/${hub.socialMedia.twitter}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:twitter" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.facebook}
					<a
						href={`https://facebook.com/${hub.socialMedia.facebook}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:facebook" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.instagram}
					<a
						href={`https://instagram.com/${hub.socialMedia.instagram}`}
						target="_blank"
						class="text-gray-600 hover:text-pink-600"
					>
						<Icon icon="mdi:instagram" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.linkedin}
					<a
						href={`https://linkedin.com/in/${hub.socialMedia.linkedin}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-700"
					>
						<Icon icon="mdi:linkedin" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.youtube}
					<a
						href={`https://youtube.com/${hub.socialMedia.youtube}`}
						target="_blank"
						class="text-gray-600 hover:text-red-600"
					>
						<Icon icon="mdi:youtube" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.tiktok}
					<a
						href={`https://tiktok.com/@${hub.socialMedia.tiktok}`}
						target="_blank"
						class="text-gray-600 hover:text-black"
					>
						<Icon icon="simple-icons:tiktok" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.github}
					<a
						href={`https://github.com/${hub.socialMedia.github}`}
						target="_blank"
						class="text-gray-600 hover:text-gray-900"
					>
						<Icon icon="mdi:github" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.discord}
					<a
						href={hub.socialMedia.discord}
						target="_blank"
						class="text-gray-600 hover:text-indigo-600"
					>
						<Icon icon="mdi:discord" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.telegram}
					<a
						href={`https://t.me/${hub.socialMedia.telegram}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-500"
					>
						<Icon icon="mdi:telegram" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.whatsapp}
					<a
						href={`https://wa.me/${hub.socialMedia.whatsapp}`}
						target="_blank"
						class="text-gray-600 hover:text-green-600"
					>
						<Icon icon="mdi:whatsapp" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.wechat}
					<a
						href="#asdasd"
						class="text-gray-600 hover:text-green-500"
						title={`WeChat ID: ${hub.socialMedia.wechat}`}
					>
						<Icon icon="mdi:wechat" width="24" height="24" />
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Hub Members -->
<div class="mt-6 bg-white shadow-md rounded-xl p-6">
	<div class="flex flex-wrap items-center justify-between gap-3 mb-5">
		<div>
			<h2 class="text-xl font-semibold text-gray-800">Hub Members</h2>
			<p class="text-sm text-gray-500">Structured overview of all people with access to this hub.</p>
		</div>
		<div class="text-sm font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1">
			Total: {1 + assistantManagers.length + reviewersOnly.length}
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
		<div class="rounded-xl border border-violet-200 bg-violet-50 p-4">
			<div class="text-xs uppercase tracking-wide font-semibold text-violet-800 mb-1">Owner</div>
			<div class="text-2xl font-bold text-violet-900">1</div>
		</div>
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
			<div class="text-xs uppercase tracking-wide font-semibold text-amber-800 mb-1">Vice Managers</div>
			<div class="text-2xl font-bold text-amber-900">{assistantManagers.length}</div>
		</div>
		<div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
			<div class="text-xs uppercase tracking-wide font-semibold text-blue-800 mb-1">Reviewers</div>
			<div class="text-2xl font-bold text-blue-900">{reviewersOnly.length}</div>
		</div>
	</div>

	<div class="rounded-xl border border-surface-200 p-4">
		<div class="flex flex-wrap items-center gap-2 justify-between mb-3">
			<div class="flex items-center gap-2">
				<button class="btn btn-xs {memberDashboardFilter === 'all' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberDashboardFilter = 'all')}>All</button>
				<button class="btn btn-xs {memberDashboardFilter === 'owner' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberDashboardFilter = 'owner')}>Owner</button>
				<button class="btn btn-xs {memberDashboardFilter === 'vice' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberDashboardFilter = 'vice')}>Vice</button>
				<button class="btn btn-xs {memberDashboardFilter === 'reviewer' ? 'preset-filled' : 'preset-outlined'}" onclick={() => (memberDashboardFilter = 'reviewer')}>Reviewer</button>
			</div>
			<div class="relative min-w-[240px] w-full sm:w-auto">
				<input
					type="text"
					bind:value={memberDashboardSearch}
					placeholder="Search by name or email"
					class="w-full p-2.5 pl-9 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
				<Icon icon="mdi:magnify" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
			</div>
		</div>

		<div class="max-h-72 overflow-auto rounded-lg border border-surface-200">
			<div class="grid grid-cols-[1.4fr_1fr_1.2fr] gap-2 px-3 py-2 text-xs font-semibold text-gray-500 bg-surface-50 sticky top-0">
				<div>Member</div>
				<div>Role</div>
				<div>Contact</div>
			</div>
			{#if getHubMemberRows().length > 0}
				{#each getHubMemberRows() as row}
					<div class="grid grid-cols-[1.4fr_1fr_1.2fr] gap-2 px-3 py-2.5 border-t border-surface-200 items-center">
						<div class="flex items-center gap-2 min-w-0">
							{#if row.avatarUrl}
								<img src={row.avatarUrl} alt={memberName(row.member)} class="w-8 h-8 rounded-full object-cover" />
							{:else}
								<div class="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-[11px]">
									{getInitials(row.member?.firstName || row.member?.name || 'M', row.member?.lastName || '')}
								</div>
							{/if}
							<div class="text-sm font-medium text-gray-900 truncate">{memberName(row.member)}</div>
						</div>
						<div>
							{#if row.role === 'owner'}
								<span class="inline-flex rounded-full bg-violet-100 text-violet-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Owner</span>
							{:else if row.role === 'vice'}
								<span class="inline-flex rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Vice Manager</span>
							{:else}
								<span class="inline-flex rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Reviewer</span>
							{/if}
						</div>
						<div class="text-xs text-gray-500 truncate">{memberEmail(row.member)}</div>
					</div>
				{/each}
			{:else}
				<div class="px-3 py-8 text-center text-sm text-gray-500">
					No members found for the selected filter.
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Hub Management Section -->
{#if isHubManager}
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold text-gray-800">Hub Management</h2>

		<div class="flex gap-2">
			<!-- <ReviewerManagement reviewer={data.user} hubId={hub._id} {isCreator} /> -->
			<ReviewerManagement
				hubId={hub._id}
				canManageHub={isHubManager}
				canInviteVice={isCreator}
				assistantManagerIds={(hub.assistantManagers || []).map((m: any) => normalizeId(m)).filter(Boolean) as string[]}
				users={data.users as any[]}
			/>
		</div>
	</div>
{/if}

<!-- Papers Section -->
<PapersSection 
	papers={filteredPapers} 
	{hub} 
	{isCreator} 
	isHubManager={isHubManager}
	userId={data.user.id} 
	{shouldHighlight} 
	reviewAssignments={data.reviewAssignments}
/>

<!-- Informações Gerais -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Informações Gerais</h2>
	<p><strong>Status:</strong> {hub.status}</p>
	<p><strong>Criado por:</strong> {hub.createdBy}</p>
</div> -->

<!-- Revisão e Visibilidade -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Revisão</h2>
	<p><strong>Revisão por:</strong> {hub.peerReview}</p>
	<p><strong>Convite para autores:</strong> {hub.authorInvite}</p>
	<p><strong>Visibilidade da identidade:</strong> {hub.identityVisibility}</p>
	<p><strong>Visibilidade da revisão:</strong> {hub.reviewVisibility}</p>
</div> -->

<!-- Licenças e Diretrizes -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Publicação</h2> -->

<!-- {#if hub.acknowledgement}
		<div class="mt-6 bg-white shadow rounded-xl p-4">
			<h2 class="text-xl font-semibold text-gray-800 mb-2">Agradecimentos e Regras</h2>
			<div class="prose prose-sm text-gray-800 max-w-none">{@html hub.acknowledgement}</div>
		</div>
	{/if} -->

<!-- {#if hub.licenses && hub.licenses.length > 0}
		<p><strong>Licenças:</strong> {hub.licenses.join(', ')}</p>
	{:else}
		<p><strong>Licenças:</strong> Nenhuma</p>
	{/if}
	{#if hub.extensions}
		<p><strong>Extensões:</strong> {hub.extensions}</p>
	{/if}
</div>
 -->

<!-- Outros Campos -->
<!-- {#if hub.tracks || hub.calendar}
	<div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
		<h2 class="text-xl font-semibold text-gray-800">Outros</h2>
		{#if hub.tracks}
			<p><strong>Trilhas:</strong> {hub.tracks}</p>
		{/if}
		{#if hub.calendar}
			<p><strong>Calendário:</strong> {hub.calendar}</p>
		{/if}
		<p><strong>Mostrar calendário:</strong> {hub.showCalendar ? 'Sim' : 'Não'}</p>
	</div>
{/if} -->
