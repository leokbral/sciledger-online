<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Avatar, Modal } from '@skeletonlabs/skeleton-svelte';
	import { getInitials } from '$lib/utils/GetInitials';
	import { toaster } from '$lib/toaster-svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { Hub } from '$lib/types/Hub';
	import type { User } from '$lib/types/User';
	import ManageReviewerDeadline from '$lib/components/ReviewerManagement/ManageReviewerDeadline.svelte';

	interface Props {
		papers: Paper[];
		hub: Hub;
		isCreator: boolean;
		isHubManager: boolean;
		isHubReviewer?: boolean;
		userId: string;
		shouldHighlight: (paper: any) => boolean;
		reviewAssignments?: any[];
		pendingPaperInvitations?: Array<{
			paperId: string;
			reviewerId: string;
		}>;
		effectiveReviewers?: Array<User | any>;
	}

	let {
		papers,
		hub,
		isCreator,
		isHubManager,
		isHubReviewer = false,
		userId,
		shouldHighlight,
		reviewAssignments,
		pendingPaperInvitations = [],
		effectiveReviewers = []
	}: Props = $props();

	let hubId = $derived(hub._id);
	let reviewerDirectory = $derived(effectiveReviewers);

	function getPaperSlug(paper: any): string {
		return (paper?.id || paper?._id || '') as string;
	}

	function formatPaperStatus(value: string | null | undefined) {
		const status = String(value ?? '').trim();
		if (!status) return 'Manuscript';

		return status
			.split(/[\s_-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
			.join(' ');
	}

	function getPaperStatusClasses(paper: any) {
		if (paper?.status === 'published') {
			return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
		}
		if (paper?.status === 'rejected' || paper?.rejectedByHub) {
			return 'bg-red-50 text-red-700 ring-red-200';
		}
		if (isDesignatedReviewer(paper)) {
			return 'bg-blue-50 text-blue-700 ring-blue-200';
		}
		if (shouldHighlight(paper)) {
			return 'bg-amber-50 text-amber-800 ring-amber-200';
		}
		return 'bg-surface-100 text-surface-600 ring-surface-200';
	}

	function isPaperAuthor(paper: Paper): boolean {
		const userAlias = String(userId);
		const mainAuthorIds = getIdAliases(paper.mainAuthor);
		if (mainAuthorIds.includes(userAlias)) return true;

		const correspondingIds = getIdAliases(paper.correspondingAuthor);
		if (correspondingIds.includes(userAlias)) return true;

		const submittedIds = getIdAliases(paper.submittedBy);
		if (submittedIds.includes(userAlias)) return true;

		return (paper.coAuthors ?? []).some((author: any) => {
			return getIdAliases(author).includes(userAlias);
		});
	}

	function getReadMoreHref(paper: any): string {
		const slug = getPaperSlug(paper);
		if (!slug) return '#';

		// Hub admin: publication approval requested after round 2
		if (isCreator && paper?.status === 'reviewer assignment' && paper?.reviewRound === 2) {
			return `/publish/publication-approval/${slug}`;
		}

		if (paper?.status === 'reviewer assignment' && isDesignatedReviewer(paper)) {
			return `/review/inreview/${slug}`;
		}

		// Hub authors should see the review page with submitted reviews or corrections editor.
		if (isPaperAuthor(paper)) {
			if (paper?.status === 'in review') {
				return `/review/inreview/${slug}`;
			}
			if (paper?.status === 'needing corrections' || paper?.status === 'under correction') {
				return `/publish/corrections/${slug}`;
			}
		}

		// Review routes are only for designated reviewers (non-authors).
		if (isDesignatedReviewer(paper) && !isPaperAuthor(paper)) {
			if (paper?.status === 'in review') return `/review/inreview/${slug}`;
			if (paper?.status === 'needing corrections' || paper?.status === 'under correction') {
				return `/review/correction/${slug}`;
			}
		}

		// Default routing by status (for authors/creators)
		if (paper?.status === 'reviewer assignment') {
			// Se for creator (hub owner), mostra na rota view
			if (isHubManager) return `/publish/view/${slug}`;
			return `/publish/reviewer-assignment/${slug}`;
		}
		if (paper?.status === 'in review') return `/publish/inreview/${slug}`;
		if (paper?.status === 'needing corrections' || paper?.status === 'under correction') {
			return `/publish/corrections/${slug}`;
		}
		if (paper?.status === 'rejected' || paper?.rejectedByHub) {
			// Papers rejeitados vão para view se for creator
			if (isHubManager) return `/publish/view/${slug}`;
		}
		return `/publish/published/${slug}`;
	}

	// Verificar se o usuário é revisor designado deste paper
	function isDesignatedReviewer(paper: Paper): boolean {
		if (paper.isAcceptedForReview === true) {
			return true;
		}

		return (paper.peer_review?.responses ?? []).some((response: any) => {
			return (
				getIdAliases(response?.reviewerId).includes(String(userId)) &&
				(response?.status === 'accepted' || response?.status === 'completed')
			);
		});
	}

	function canUseReviewerView(paper: Paper): boolean {
		return isCreator || isHubReviewer || isDesignatedReviewer(paper);
	}

	let selectedPaper: Paper | null = $state(null);
	let selectedAuthorsPaper: Paper | null = $state(null);
	let selectedReviewers: string[] = $state([]);
	let openInviteModal = $state(false);
	let openManageReviewersModal = $state(false);
	let openManageDeadlinesModal = $state(false);
	let openRejectModal = $state(false);
	let openAuthorsModal = $state(false);
	let rejectionReason = $state('');
	let loading = $state(false);
	let searchTerm = $state('');
	let inviteTab = $state<'hub' | 'email'>('hub');
	let emailInvite = $state('');
	let customDeadlineDays = $state(15);

	function getIdAliases(value: any): string[] {
		if (!value) return [];

		if (typeof value === 'string') {
			return [String(value)];
		}

		const aliases = [value.id, value._id].filter(Boolean).map((alias) => String(alias));

		if (typeof value?.toString === 'function') {
			const stringified = String(value.toString()).trim();
			if (stringified && stringified !== '[object Object]') {
				aliases.push(stringified);
			}
		}

		return Array.from(new Set(aliases));
	}

	function intersectsAliases(source: any, blockedIds: Set<string>): boolean {
		return getIdAliases(source).some((alias) => blockedIds.has(alias));
	}

	// Filtrar revisores disponíveis que ainda não foram convidados
	// Excluir também autores, co-autores e submitter
	function getAvailableReviewers(paper: Paper): Array<User | string> {
		if (!reviewerDirectory || !Array.isArray(reviewerDirectory)) return [];

		const paperId = String(paper?.id || paper?._id || '');
		const assignedIds = new Set<string>(
			(paper.peer_review?.assignedReviewers || []).flatMap((reviewer: any) =>
				getIdAliases(reviewer)
			)
		);

		// Coletar IDs de autores, co-autores e submitter
		const authorIds = new Set<string>();

		getIdAliases(paper.mainAuthor).forEach((id) => authorIds.add(id));
		(paper.coAuthors || []).forEach((author: any) => {
			getIdAliases(author).forEach((id) => authorIds.add(id));
		});
		getIdAliases(paper.submittedBy).forEach((id) => authorIds.add(id));

		const pendingReviewerIds = new Set<string>(
			(pendingPaperInvitations || [])
				.filter((invite) => invite.paperId === paperId)
				.flatMap((invite) => getIdAliases(invite.reviewerId))
		);

		return reviewerDirectory.filter((reviewer: any) => {
			const reviewerId = getIdAliases(reviewer);
			// Excluir se já foi atribuído
			if (reviewerId.some((alias) => assignedIds.has(alias))) {
				return false;
			}
			// Excluir se é autor/coautor/submitter
			if (reviewerId.some((alias) => authorIds.has(alias))) {
				return false;
			}

			if (reviewerId.some((alias) => pendingReviewerIds.has(alias))) {
				return false;
			}
			return true;
		});
	}

	// Filtrar revisores com base na busca
	function getFilteredReviewers(paper: Paper): Array<User | string> {
		const available = getAvailableReviewers(paper);
		if (!searchTerm) return available;

		return available.filter((reviewer: any) => {
			const rev = typeof reviewer === 'object' ? reviewer : null;
			if (!rev) return false;
			const fullName = `${rev.firstName} ${rev.lastName}`.toLowerCase();
			return fullName.includes(searchTerm.toLowerCase());
		});
	}

	function openInviteDialog(paper: Paper) {
		selectedPaper = paper;
		selectedReviewers = [];
		searchTerm = '';
		inviteTab = 'hub';
		emailInvite = '';
		customDeadlineDays = 15;
		openInviteModal = true;
	}

	function openManageReviewersDialog(paper: Paper) {
		selectedPaper = paper;
		openManageReviewersModal = true;
	}

	function openManageDeadlinesDialog(paper: Paper) {
		selectedPaper = paper;
		openManageDeadlinesModal = true;
	}

	function openRejectDialog(paper: Paper) {
		selectedPaper = paper;
		rejectionReason = '';
		openRejectModal = true;
	}

	function openAuthorsDialog(paper: Paper) {
		selectedAuthorsPaper = paper;
		openAuthorsModal = true;
	}

	async function rejectPaper() {
		if (!selectedPaper || !rejectionReason.trim()) {
			toaster.error({
				title: 'Validation Error',
				description: 'Please provide a rejection reason'
			});
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/papers/${selectedPaper._id}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rejectionReason: rejectionReason.trim() })
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success({
					title: 'Success',
					description: 'Paper rejected successfully. Author has been notified.'
				});
				openRejectModal = false;
				rejectionReason = '';
				// Refresh the page to show updated status
				window.location.reload();
			} else {
				toaster.error({ title: 'Error', description: data.error || 'Failed to reject paper' });
			}
		} catch (error) {
			console.error(error);
			toaster.error({ title: 'Error', description: 'An error occurred while rejecting the paper' });
		} finally {
			loading = false;
		}
	}

	async function removeReviewer(reviewerId: string) {
		if (!selectedPaper) return;

		const confirmRemove = confirm('Are you sure you want to remove this reviewer from the paper?');
		if (!confirmRemove) return;

		loading = true;
		try {
			const response = await fetch(`/api/papers/${selectedPaper.id}/remove-reviewer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reviewerId: reviewerId
				})
			});

			if (response.ok) {
				toaster.success({ title: 'Success', description: 'Reviewer removed successfully' });
				// Recarregar a página para atualizar a lista
				window.location.reload();
			} else {
				throw new Error('Failed to remove reviewer');
			}
		} catch (error) {
			console.error(error);
			toaster.error({ title: 'Error', description: 'Failed to remove reviewer' });
		} finally {
			loading = false;
		}
	}

	function toggleReviewer(reviewerId: string) {
		if (selectedReviewers.includes(reviewerId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}

	function getAuthorAcademicInfo(
		paper: any,
		author: any
	): { department: string; university: string } {
		if (!author) return { department: '', university: '' };

		const authorId = String(author?.id || author?._id || '').trim();
		const authorUsername = String(author?.username || '').trim();

		if (Array.isArray(paper?.authorAffiliations)) {
			const matchedAffiliation = paper.authorAffiliations.find((item: any) => {
				const affiliationUserId = String(item?.userId || '').trim();
				const affiliationUsername = String(item?.username || '').trim();

				if (authorId && affiliationUserId && authorId === affiliationUserId) return true;
				if (authorUsername && affiliationUsername && authorUsername === affiliationUsername)
					return true;
				return false;
			});

			const customDepartment = String(matchedAffiliation?.department || '').trim();
			const customUniversity = String(matchedAffiliation?.affiliation || '').trim();
			if (customDepartment || customUniversity) {
				return { department: customDepartment, university: customUniversity };
			}
		}

		return {
			department: String(author?.position || '').trim(),
			university: String(author?.institution || '').trim()
		};
	}

	function getPaperAuthors(paper: any): any[] {
		const list: any[] = [];
		if (paper?.mainAuthor) list.push(paper.mainAuthor);
		if (Array.isArray(paper?.coAuthors)) list.push(...paper.coAuthors.filter(Boolean));
		return list;
	}

	function formatInvitationDate(value: string | null | undefined) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatInvitationIssues(
		skipped: Array<{ reviewerId: string; reasons: string[]; existingInvitation?: any }> = []
	) {
		const duplicate = skipped.find((entry) => entry.existingInvitation?.invitation);
		if (duplicate?.existingInvitation) {
			const details = duplicate.existingInvitation;
			const invitedBy = details.invitedBy?.name || 'Unknown user';
			const role = details.invitedBy?.roleLabel || details.invitedBy?.role || 'Member';
			const status = details.statusLabel || details.status || 'Unknown';
			const invitedAt = formatInvitationDate(details.invitedAt);
			return [
				'Reviewer already invited for this paper',
				`Invited by: ${invitedBy}`,
				`Role: ${role}`,
				invitedAt ? `Date: ${invitedAt}` : '',
				`Status: ${status}`
			]
				.filter(Boolean)
				.join(' | ');
		}

		return skipped
			.flatMap((entry) => entry.reasons || [])
			.filter(Boolean)
			.slice(0, 3)
			.join(' | ');
	}

	async function sendInvitations() {
		if (!selectedPaper || selectedReviewers.length === 0) return;

		loading = true;
		try {
			const response = await fetch('/api/paper-reviewer-invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					paperId: selectedPaper.id,
					hubId: hub._id,
					reviewerIds: selectedReviewers,
					customDeadlineDays
				})
			});

			const data = await response.json();
			const requestSucceeded = response.ok && data.success !== false;

			if (requestSucceeded) {
				toaster.success({
					title: 'Success',
					description:
						data.message || `Invited ${selectedReviewers.length} reviewer(s) successfully!`
				});
				openInviteModal = false;
				selectedReviewers = [];
			} else {
				toaster.warning({
					title: data.success === false ? 'No invitations created' : 'Error',
					description:
						formatInvitationIssues(data.skipped) ||
						data.message ||
						data.error ||
						'Failed to send invitations'
				});
			}
		} catch (error) {
			console.error(error);
			toaster.error({ title: 'Error', description: 'An error occurred' });
		} finally {
			loading = false;
		}
	}

	async function sendEmailInvitation() {
		if (!selectedPaper) return;

		if (!emailInvite.trim()) {
			toaster.warning({ title: 'Please enter an email address' });
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(emailInvite)) {
			toaster.error({ title: 'Invalid email', description: 'Please enter a valid email address' });
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/email-reviewer-invitation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: emailInvite,
					hubId: hub._id,
					paperId: selectedPaper.id,
					customDeadlineDays
				})
			});

			const data = await response.json();

			if (response.ok) {
				toaster.success({
					title: 'Invitation sent!',
					description: 'The reviewer will receive an email with registration instructions.'
				});
				emailInvite = '';
				openInviteModal = false;
			} else {
				toaster.warning({
					title:
						data.error === 'Reviewer already invited for this paper'
							? 'Reviewer already invited'
							: 'Error',
					description:
						formatInvitationIssues(data.skipped) || data.error || 'Failed to send invitation'
				});
			}
		} catch (error) {
			console.error('Error sending email invitation:', error);
			toaster.error({
				title: 'Error',
				description: 'An error occurred while sending the invitation'
			});
		} finally {
			loading = false;
		}
	}
</script>

<section class="space-y-6">
	<div
		class="flex flex-col gap-4 border-b border-surface-200 pb-5 sm:flex-row sm:items-end sm:justify-between"
	>
		<div class="max-w-3xl">
			<p class="text-xs font-medium uppercase tracking-wide text-surface-500">
				Manuscript workspace
			</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-surface-950">Manuscripts</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">
				Submissions, reviews, and publication decisions connected to this Hub.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<a
				href="/paper-template.docx"
				download="SciLedger_Paper_Template.docx"
				class="btn inline-flex items-center justify-center gap-2 rounded-full border border-surface-200 bg-white px-3.5 py-2 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
			>
				<Icon icon="mdi:download" class="size-4" />
				<span>Template</span>
			</a>
			<a
				data-sveltekit-reload
				href="/publish/new?hubId={hubId}"
				class="btn preset-filled-primary-500 inline-flex items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white"
				data-sveltekit-preload-data="hover"
			>
				<Icon icon="mdi:file-document-plus" class="size-4" />
				<span>Submit Manuscript</span>
			</a>
		</div>
	</div>

	{#if papers && papers.length > 0}
		<div class="overflow-hidden rounded-xl border border-surface-200 bg-white">
			{#each papers as paper}
				<article
					class="border-b border-l-2 border-b-surface-100 border-l-transparent p-5 transition duration-150 last:border-b-0 hover:bg-surface-50/80 sm:p-6"
					class:border-l-red-300={paper.status === 'rejected' || paper.rejectedByHub}
					class:border-l-amber-300={paper.status !== 'published' &&
						paper.status !== 'rejected' &&
						shouldHighlight(paper) &&
						!isDesignatedReviewer(paper)}
					class:border-l-blue-300={paper.status !== 'published' &&
						paper.status !== 'rejected' &&
						isDesignatedReviewer(paper)}
				>
					{#if paper.status === 'rejected'}
						<div
							class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900"
						>
							<Icon icon="mdi:close-circle" class="mt-0.5 size-5 flex-shrink-0 text-red-600" />
							<div class="flex-1">
								<span class="font-bold block mb-1">This paper has been rejected</span>
								{#if paper.rejectionReason}
									<span class="text-xs block">Reason: {paper.rejectionReason}</span>
								{/if}
								{#if paper.rejectedAt}
									<span class="text-xs block mt-1 opacity-75">
										Declined on {new Date(paper.rejectedAt).toLocaleDateString()}
									</span>
								{/if}
							</div>
						</div>
					{:else if paper.status !== 'published'}
						{#if isDesignatedReviewer(paper)}
							<div
								class="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-900"
							>
								<Icon icon="mdi:account-check" class="size-5 text-blue-600" />
								<span>
									You are the <strong>designated reviewer</strong> for this article. You can view and
									review it.
								</span>
							</div>
						{:else if shouldHighlight(paper)}
							<div
								class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm font-medium text-yellow-900"
							>
								{#if isHubManager || isHubReviewer}
									This article has <strong>not been published</strong> yet and is visible to you as
									a hub {isCreator ? 'owner' : isHubManager ? 'Editor-in-chief' : 'reviewer'}.
								{:else}
									This article has <strong>not been published</strong> yet and is visible only to you
									and the authors involved.
								{/if}
							</div>
						{/if}
					{/if}

					<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
									{hub.type ? `${hub.type} paper` : 'Manuscript'}
								</p>
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset {getPaperStatusClasses(
										paper
									)}"
								>
									{paper.rejectedByHub ? 'Declined' : formatPaperStatus(paper.status)}
								</span>
							</div>
							<h3
								class="mt-3 text-xl font-semibold leading-snug tracking-tight text-surface-950 sm:text-2xl"
							>
								<a href={getReadMoreHref(paper)} class="transition hover:text-primary-700">
									{@html paper.title}
								</a>
							</h3>
							<div
								class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-surface-500"
							>
								{#if paper.mainAuthor}
									<a
										href={`/profile/${paper.mainAuthor.username}`}
										class="font-medium text-surface-800 transition hover:text-primary-700"
									>
										{paper.mainAuthor.firstName + ' ' + paper.mainAuthor.lastName}
									</a>
								{/if}
								<span>{new Date(paper.createdAt).toLocaleDateString()}</span>
								<button
									class="btn btn-xs rounded-full border border-surface-200 bg-white text-surface-600 transition hover:border-surface-300 hover:bg-surface-50 hover:text-surface-950"
									onclick={() => openAuthorsDialog(paper)}
								>
									<Icon icon="mdi:account-details" width="16" height="16" />
									Authors
								</button>
							</div>

							{#if paper.abstract}
								<p class="mt-5 max-w-4xl line-clamp-2 text-sm leading-6 text-surface-700">
									{@html paper.abstract}
								</p>
							{/if}
						</div>
					</div>

					<!-- Bottom section with keywords and actions -->
					<div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div>
							{#if paper.keywords?.length}
								<div class="flex gap-2 mt-2 flex-wrap">
									{#each paper.keywords as keyword}
										<span
											class="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600"
										>
											{keyword}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Action buttons -->
						<div class="flex flex-wrap items-center gap-2 sm:justify-end">
							{#if isHubManager && paper.status !== 'published'}
								{#if isCreator && paper.status === 'reviewer assignment' && !paper.rejectedByHub}
									<button
										class="btn btn-sm preset-filled-error-500 flex items-center gap-1 rounded-full text-white transition"
										onclick={() => openRejectDialog(paper)}
									>
										<Icon icon="mdi:close-circle" width="20" height="20" />
										Decline Decision
									</button>
								{/if}
								{#if paper.rejectedByHub}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800"
									>
										<Icon icon="mdi:close-circle" width="18" height="18" />
										Declined
									</span>
								{/if}
								{#if getAvailableReviewers(paper).length > 0 && !paper.rejectedByHub}
									<button
										class="btn btn-sm preset-filled-primary-500 flex items-center gap-1 rounded-full text-white transition"
										onclick={() => openInviteDialog(paper)}
									>
										<Icon icon="mdi:account-plus" width="20" height="20" />
										Invite Reviewers
									</button>
								{/if}
								{#if paper.reviewers && paper.reviewers.length > 0}
									<button
										class="btn btn-sm flex items-center gap-1 rounded-full border border-surface-200 bg-white text-surface-700 transition hover:border-surface-300 hover:bg-surface-50"
										onclick={() => openManageReviewersDialog(paper)}
									>
										<Icon icon="mdi:account-cog" width="20" height="20" />
										Manage Reviewers
									</button>
									<button
										class="btn btn-sm flex items-center gap-1 rounded-full border border-surface-200 bg-white text-surface-700 transition hover:border-surface-300 hover:bg-surface-50"
										onclick={() => openManageDeadlinesDialog(paper)}
									>
										<Icon icon="mdi:calendar-clock" width="20" height="20" />
										Manage Deadlines
									</button>
								{/if}
							{/if}
							<a
								href={getReadMoreHref(paper)}
								class="btn btn-sm flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 transition hover:bg-primary-100 hover:text-primary-800"
							>
								Open manuscript
								<Icon icon="mdi:arrow-right" width="20" height="20" />
							</a>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="rounded-xl border border-dashed border-surface-300 bg-white px-6 py-14 text-center">
			<Icon icon="mdi:file-document-outline" class="mx-auto size-10 text-surface-300" />
			<p class="mt-3 text-sm font-semibold text-surface-700">No manuscripts submitted yet.</p>
			<p class="mt-1 text-sm text-surface-500">New submissions for this Hub will appear here.</p>
		</div>
	{/if}
</section>

<!-- Authors and affiliations modal -->
<Modal
	open={openAuthorsModal}
	onOpenChange={(e) => (openAuthorsModal = e.open)}
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-4 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[92vw]"
>
	{#snippet content()}
		{#if selectedAuthorsPaper}
			<div class="space-y-4">
				<div class="flex justify-between items-center border-b pb-3">
					<div>
						<h3 class="text-xl font-bold text-gray-900 dark:text-white">Authors</h3>
						<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
							{@html selectedAuthorsPaper.title}
						</p>
					</div>
					<button class="btn-icon btn-icon-sm" onclick={() => (openAuthorsModal = false)}>
						<Icon icon="mdi:close" class="text-gray-600" />
					</button>
				</div>

				<div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
					{#each getPaperAuthors(selectedAuthorsPaper) as authorItem}
						{@const academicInfo = getAuthorAcademicInfo(selectedAuthorsPaper, authorItem)}
						<div
							class="flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-700 p-3 bg-surface-50 dark:bg-surface-900"
						>
							<div class="flex items-center gap-3">
								{#if authorItem?.profilePictureUrl}
									<Avatar
										src={authorItem.profilePictureUrl}
										name={authorItem.firstName}
										size="w-9"
									/>
								{:else}
									<div class="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center">
										<span class="text-xs font-bold text-gray-600">
											{getInitials(authorItem.firstName, authorItem.lastName)}
										</span>
									</div>
								{/if}
								<div class="leading-tight">
									<a
										href={`/profile/${authorItem.username}`}
										class="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
									>
										{authorItem.firstName}
										{authorItem.lastName}
									</a>
									<p class="text-xs text-gray-500">Author profile</p>
								</div>
							</div>
							{#if academicInfo.department || academicInfo.university}
								<details class="text-right">
									<summary
										class="text-xs text-primary-700 hover:text-primary-800 cursor-pointer select-none"
										>Details</summary
									>
									<div class="mt-1 flex flex-col items-end gap-1">
										{#if academicInfo.department}
											<span class="px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-800">
												{academicInfo.department}
											</span>
										{/if}
										{#if academicInfo.university}
											<span class="px-2 py-1 rounded-full text-xs bg-sky-100 text-sky-800">
												{academicInfo.university}
											</span>
										{/if}
									</div>
								</details>
							{:else}
								<span class="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
									No academic data
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>

<!-- Modal para gerenciar revisores -->
<Modal
	open={openManageReviewersModal}
	onOpenChange={(e) => (openManageReviewersModal = e.open)}
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
>
	{#snippet content()}
		{#if selectedPaper}
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<h3 class="text-xl font-bold text-gray-900 dark:text-white">Manage Reviewers</h3>
					<button class="btn-icon btn-icon-sm" onclick={() => (openManageReviewersModal = false)}>
						<Icon icon="mdi:close" class="text-gray-500" />
					</button>
				</div>

				<p class="text-sm text-gray-600 dark:text-gray-400">
					Paper: <strong>{@html selectedPaper.title}</strong>
				</p>

				<div class="space-y-2">
					<h4 class="font-medium text-gray-900 dark:text-white">Current Reviewers:</h4>
					{#if selectedPaper.reviewers && selectedPaper.reviewers.length > 0}
						<div class="space-y-2">
							{#each selectedPaper.reviewers as reviewer}
								{@const reviewerId =
									typeof reviewer === 'object' ? reviewer._id || reviewer.id : reviewer}
								{@const rev =
									typeof reviewer === 'object'
										? reviewer
										: reviewerDirectory?.find((r: any) => {
												const rId = typeof r === 'object' ? r._id || r.id : r;
												return rId === reviewer;
											})}
								{#if rev && typeof rev === 'object'}
									<div
										class="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"
									>
										<div class="flex items-center gap-3">
											<div
												class="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold"
											>
												{getInitials(rev.firstName, rev.lastName)}
											</div>
											<div>
												<div class="font-medium text-gray-900 dark:text-white">
													{rev.firstName}
													{rev.lastName}
												</div>
												<div class="text-sm text-gray-500">{rev.email}</div>
											</div>
										</div>
										<button
											class="btn btn-sm preset-filled-error-500"
											onclick={() => removeReviewer(reviewerId)}
											disabled={loading}
										>
											<Icon icon="mdi:delete" class="mr-1" />
											Remove
										</button>
									</div>
								{:else}
									<div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
										<p class="text-sm text-yellow-800 dark:text-yellow-200">
											Reviewer ID: {reviewerId} (not found in effective hub reviewers)
										</p>
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 text-sm">No reviewers assigned yet.</p>
					{/if}
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>

<!-- Modal para convidar revisores -->
<Modal
	open={openInviteModal}
	onOpenChange={(e) => (openInviteModal = e.open)}
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full sm:w-[90vw]"
>
	{#snippet content()}
		<header class="flex justify-between items-center border-b pb-2 mb-4">
			<h2 class="text-2xl font-semibold">Invite Hub Reviewers</h2>
		</header>

		{#if selectedPaper}
			<div class="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
				<p class="text-sm text-gray-600 dark:text-gray-400">Paper:</p>
				<p class="font-medium text-gray-900 dark:text-white">{@html selectedPaper.title}</p>
			</div>

			<div class="flex border-b border-surface-300 mb-6">
				<button
					class="px-4 py-2 flex items-center gap-2 transition-colors {inviteTab === 'hub'
						? 'border-b-2 border-primary-500 text-primary-500 font-semibold'
						: 'text-surface-600 hover:text-surface-900'}"
					onclick={() => (inviteTab = 'hub')}
				>
					<Icon icon="mdi:account-group" class="size-5" />
					Hub Reviewers
				</button>
				<button
					class="px-4 py-2 flex items-center gap-2 transition-colors {inviteTab === 'email'
						? 'border-b-2 border-primary-500 text-primary-500 font-semibold'
						: 'text-surface-600 hover:text-surface-900'}"
					onclick={() => (inviteTab = 'email')}
				>
					<Icon icon="mdi:email-plus" class="size-5" />
					Invite by Email
				</button>
			</div>

			{#if inviteTab === 'hub'}
				{#if getAvailableReviewers(selectedPaper).length === 0}
					<p class="text-center text-gray-500 dark:text-gray-400">
						All hub reviewers have already been invited to review this paper.
					</p>
				{:else}
					<div class="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
						<label class="block mb-2">
							<span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Review Deadline (days)</span
							>
							<p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
								Set the number of days reviewers will have to complete the review after accepting
							</p>
							<div class="flex items-center gap-3">
								<input
									type="number"
									bind:value={customDeadlineDays}
									min="1"
									max="90"
									class="input w-32 text-center"
									placeholder="15"
								/>
								<span class="text-sm text-gray-600 dark:text-gray-400"> days from acceptance </span>
							</div>
						</label>
					</div>

					<!-- Search -->
					<div class="relative">
						<input
							type="text"
							bind:value={searchTerm}
							placeholder="Search reviewers..."
							class="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-surface-700 dark:text-white"
						/>
						<Icon
							icon="mdi:magnify"
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
						/>
					</div>
					<div
						class="flex items-center justify-between mt-3 mb-1 text-sm text-gray-600 dark:text-gray-300"
					>
						<span
							class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200 font-semibold"
						>
							<Icon icon="mdi:account-multiple" class="size-4" />
							Selected: {selectedReviewers.length}
						</span>
						<span class="text-xs text-gray-500 dark:text-gray-400"
							>First 3 acceptances occupy slots; extra invites stay pending.</span
						>
					</div>

					<!-- Lista de revisores filtrados -->
					{#if getFilteredReviewers(selectedPaper).length > 0}
						<div class="max-h-64 overflow-y-auto space-y-3">
							{#each getFilteredReviewers(selectedPaper) as reviewer}
								{@const rev = typeof reviewer === 'object' ? reviewer : null}
								{#if rev}
									<label
										class="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-surface-700 hover:bg-gray-100 dark:hover:bg-surface-600 rounded-lg cursor-pointer transition-colors"
									>
										<div class="flex items-center gap-4">
											<div
												class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-surface-500"
											>
												{#if rev.profilePictureUrl}
													<img
														src={rev.profilePictureUrl}
														alt={`${rev.firstName}'s profile`}
														class="w-full h-full object-cover"
													/>
												{:else}
													<div class="w-full h-full flex items-center justify-center">
														<Icon icon="mdi:account" class="text-2xl text-gray-500" />
													</div>
												{/if}
											</div>
											<div>
												<div class="font-medium text-gray-900 dark:text-white">
													{rev.firstName}
													{rev.lastName}
												</div>
												<div class="text-sm text-gray-500">{rev.email}</div>
											</div>
										</div>
										<input
											type="checkbox"
											class="form-checkbox h-5 w-5 text-primary-600"
											checked={selectedReviewers.includes(rev._id || rev.id)}
											onchange={() => toggleReviewer(rev._id || rev.id)}
										/>
									</label>
								{/if}
							{/each}
						</div>

						<!-- Botão de adicionar -->
						<div class="flex justify-end mt-4">
							<button
								class="btn preset-filled"
								onclick={sendInvitations}
								disabled={selectedReviewers.length === 0 || loading}
							>
								<Icon icon="mdi:email-send" class="mr-2" />
								Send Invitations
							</button>
						</div>
					{:else}
						<p class="text-center text-gray-500 dark:text-gray-400">No reviewers found</p>
					{/if}
				{/if}
			{:else}
				<div class="space-y-4">
					<div class="bg-primary-50 border-l-4 border-primary-500 p-4 rounded">
						<div class="flex items-start gap-3">
							<Icon icon="mdi:information" class="size-6 text-primary-500 flex-shrink-0 mt-0.5" />
							<div>
								<p class="font-semibold text-primary-900 mb-1">Invite a Reviewer by Email</p>
								<p class="text-sm text-primary-700">
									Send an invitation to someone who doesn't have an account yet. They will receive
									an email with a registration link to join the platform as a reviewer for this hub
									and paper.
								</p>
							</div>
						</div>
					</div>

					<div>
						<label for="email-invite" class="label mb-2">
							<span>Email Address <span class="text-error-500">*</span></span>
						</label>
						<input
							type="email"
							id="email-invite"
							bind:value={emailInvite}
							placeholder="reviewer@university.edu"
							class="input"
							disabled={loading}
						/>
						<p class="text-xs text-surface-500 mt-1">
							The reviewer will receive an invitation email with a registration link
						</p>
					</div>

					<div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
						<label class="block mb-2">
							<span class="text-sm font-semibold text-gray-700 dark:text-gray-300"
								>Review Deadline (days)</span
							>
							<p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
								Set the number of days reviewers will have to complete the review after accepting
							</p>
							<div class="flex items-center gap-3">
								<input
									type="number"
									bind:value={customDeadlineDays}
									min="1"
									max="90"
									class="input w-32 text-center"
									placeholder="15"
								/>
								<span class="text-sm text-gray-600 dark:text-gray-400"> days from acceptance </span>
							</div>
						</label>
					</div>

					<div class="flex justify-end">
						<button
							class="btn preset-filled-primary-500"
							onclick={sendEmailInvitation}
							disabled={loading || !emailInvite.trim()}
						>
							{#if loading}
								<Icon icon="eos-icons:loading" class="size-5" />
								Sending...
							{:else}
								<Icon icon="mdi:email-send" class="size-5" />
								Send Email Invitation
							{/if}
						</button>
					</div>
				</div>
			{/if}
		{/if}
	{/snippet}
</Modal>

<!-- Modal para gerenciar deadlines -->
<Modal
	open={openManageDeadlinesModal}
	onOpenChange={(e) => (openManageDeadlinesModal = e.open)}
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-3xl w-full sm:w-[90vw]"
>
	{#snippet content()}
		{#if selectedPaper}
			<div class="space-y-4">
				<div class="flex justify-between items-center border-b pb-4">
					<div>
						<h3 class="text-xl font-bold text-gray-900 dark:text-white">Manage Review Deadlines</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
							{@html selectedPaper.title}
						</p>
					</div>
					<button class="btn-icon btn-icon-sm" onclick={() => (openManageDeadlinesModal = false)}>
						<Icon icon="mdi:close" class="text-gray-600" />
					</button>
				</div>

				{#if selectedPaper.reviewers && selectedPaper.reviewers.length > 0}
					<div class="space-y-3">
						{#each selectedPaper.reviewers as reviewerRef, idx}
							{@const reviewer =
								typeof reviewerRef === 'object'
									? reviewerRef
									: reviewerDirectory?.find((r: any) => {
											const rId = typeof r === 'object' ? r._id || r.id : r;
											return rId === reviewerRef;
										})}
							{@const reviewerId =
								typeof reviewerRef === 'object' ? reviewerRef._id || reviewerRef.id : reviewerRef}
							{@const assignment = reviewAssignments?.find((a) => {
								const aReviewerId =
									typeof a.reviewerId === 'object'
										? a.reviewerId._id || a.reviewerId.id
										: a.reviewerId;
								const aPaperId =
									typeof a.paperId === 'object' ? a.paperId._id || a.paperId.id : a.paperId;
								return aReviewerId === reviewerId && aPaperId === selectedPaper?.id;
							})}

							{#if reviewer}
								{@const rev = typeof reviewer === 'object' ? reviewer : null}
								{#if rev}
									<div
										class="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700"
									>
										<div class="flex items-center gap-3 flex-1">
											{#if rev.profilePictureUrl}
												<img
													src={rev.profilePictureUrl}
													alt={rev.firstName}
													class="w-12 h-12 rounded-full"
												/>
											{:else}
												<div
													class="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold"
												>
													{rev.firstName?.[0]}{rev.lastName?.[0]}
												</div>
											{/if}
											<div class="flex-1">
												<p class="font-semibold text-gray-900 dark:text-white">
													{rev.firstName}
													{rev.lastName}
												</p>
												<p class="text-xs text-gray-600 dark:text-gray-400">
													{rev.email}
												</p>
												{#if assignment?.deadline}
													{@const deadline = new Date(assignment.deadline)}
													{@const now = new Date()}
													{@const daysRemaining = Math.ceil(
														(deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
													)}
													<p
														class="text-xs mt-1 {daysRemaining > 0
															? 'text-green-600'
															: 'text-red-600'}"
													>
														<Icon icon="mdi:calendar-clock" class="inline size-3" />
														{deadline.toLocaleDateString()}
														{daysRemaining > 0
															? `(${daysRemaining} days)`
															: `(${Math.abs(daysRemaining)} days overdue)`}
													</p>
												{:else}
													<p class="text-xs mt-1 text-orange-600">
														<Icon icon="mdi:alert-circle" class="inline size-3" />
														No deadline set
													</p>
												{/if}
											</div>
										</div>

										<ManageReviewerDeadline
											paperId={selectedPaper.id}
											reviewer={rev}
											currentDeadline={assignment?.deadline}
											reviewAssignmentId={assignment?._id || assignment?.id}
										/>
									</div>
								{/if}
							{/if}
						{/each}
					</div>
				{:else}
					<div class="text-center p-8 bg-surface-50 dark:bg-surface-900 rounded-lg">
						<Icon icon="mdi:calendar-blank" class="size-12 mx-auto text-gray-400 mb-2" />
						<p class="text-gray-600 dark:text-gray-400">No reviewers assigned to this paper yet.</p>
					</div>
				{/if}
			</div>
		{/if}
	{/snippet}
</Modal>

<!-- Modal para rejeitar paper -->
<Modal
	open={openRejectModal}
	onOpenChange={(e) => (openRejectModal = e.open)}
	contentBase="card bg-white dark:bg-surface-800 p-6 space-y-6 shadow-2xl rounded-lg max-w-2xl w-full"
>
	{#snippet content()}
		{#if selectedPaper}
			<div class="space-y-4">
				<div class="flex justify-between items-center">
					<h3 class="text-xl font-bold text-error-600 dark:text-error-400">Decline Decision</h3>
					<button class="btn-icon btn-icon-sm" onclick={() => (openRejectModal = false)}>
						<Icon icon="mdi:close" class="text-gray-500" />
					</button>
				</div>

				<div
					class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
				>
					<p class="text-sm text-yellow-800 dark:text-yellow-200">
						<Icon icon="mdi:alert" class="inline mr-1" width="20" height="20" />
						<strong>Warning:</strong> Declining this paper will notify the author and they will no longer
						be able to submit it to this hub. This action cannot be undone.
					</p>
				</div>

				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
						Paper: <strong class="text-gray-900 dark:text-white">{@html selectedPaper.title}</strong
						>
					</p>
				</div>

				<div class="space-y-2">
					<label for="rejection-reason" class="block font-medium text-gray-900 dark:text-white">
						Reason for Decline <span class="text-error-600">*</span>
					</label>
					<textarea
						id="rejection-reason"
						bind:value={rejectionReason}
						rows="5"
						class="w-full p-3 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-error-500 focus:border-error-500"
						placeholder="Please provide a clear reason for rejecting this paper. This will be sent to the author."
						required
					></textarea>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						The author will receive a notification with this message.
					</p>
				</div>

				<div
					class="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700"
				>
					<button
						class="btn preset-tonal"
						onclick={() => (openRejectModal = false)}
						disabled={loading}
					>
						Cancel
					</button>
					<button
						class="btn preset-filled-error-500 text-white"
						onclick={rejectPaper}
						disabled={loading || !rejectionReason.trim()}
					>
						{#if loading}
							<Icon icon="mdi:loading" class="animate-spin mr-2" width="20" height="20" />
							Declining...
						{:else}
							<Icon icon="mdi:close-circle" class="mr-2" width="20" height="20" />
							Decline Decision
						{/if}
					</button>
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>
