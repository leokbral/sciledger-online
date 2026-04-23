<script lang="ts">
	import PaperPool from '$lib/Pages/Paper/PaperPool.svelte';
	import ReviewPage from '$lib/Pages/Review/ReviewPage.svelte';
	import type { Paper } from '$lib/types/Paper';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();
	// let papers = data.papers;
	// let papers: Paper[] = data.papers; //VERIFICAR ISSO!!!!

	let papers: Paper[] = (data.papers as any[]).map((p: any) => ({
		...p,
		coAuthors:
			p.coAuthors?.map((u: any) => ({
				id: u.id ?? u._id?.toString(),
				firstName: u.firstName,
				lastName: u.lastName,
				country: u.country,
				email: u.email,
				affiliation: u.affiliation,
				orcid: u.orcid,
				role: u.role,
				// add other User fields as needed
				...u
			})) ?? []
	}));

	// console.log(data)
	let reviews = data.reviews;

	let tabs = [
		{
			name: 'Papers Pool',
			icon: 'hugeicons:conversation',
			rota: '/review/paperspool'
		},
		{
			name: 'In Review',
			icon: 'material-symbols-light:rate-review-outline-rounded',
			rota: '/review/inreview'
		},
		{
			name: 'In Correction',
			icon: 'iconamoon:attention-circle-thin',
			rota: '/review/correction'
		},
		{
			name: 'Reviewed',
			icon: 'material-symbols-light:check-rounded',
			rota: '/review/published'
		}
	];

	// let papersPool = papers.filter(
	// 	(p: Paper) =>
	// 		p.status === 'reviewer assignment' &&
	// 		(p.reviewers.includes(data.user.id) || p.correspondingAuthor === data.user.id)
	// );
	// let papersPool = papers.filter(
	// 		(p: Paper) => p.status === 'reviewer assignment'
	// 	);

	let user: any = data.user; //userProfiles[0];
	let reviewerInvitations = data.reviewerInvitations;

	function getIdAliases(value: unknown): string[] {
		if (!value) return [];

		if (typeof value === 'string') {
			return [String(value)];
		}

		if (typeof value !== 'object') {
			return [];
		}

		const candidate = value as {
			id?: unknown;
			_id?: unknown;
			toString?: () => string;
		};

		const aliases = [candidate.id, candidate._id]
			.filter(Boolean)
			.map((alias) => String(alias));

		const stringified = candidate.toString?.();
		if (stringified && stringified !== '[object Object]') {
			aliases.push(String(stringified));
		}

		return Array.from(new Set(aliases));
	}

	function matchesUser(value: unknown, userId: string | undefined): boolean {
		if (!userId) return false;
		return getIdAliases(value).includes(String(userId));
	}

	let papersPool = papers
		.filter((p: Paper) => {
			const userId = user.id?.toString();
			const isReviewerRole = user.roles?.reviewer === true; // ← check if the user is really a reviewer

			if (!isReviewerRole) return false; // ← if not a reviewer, cannot see any paper

			const isAuthor = matchesUser(p.correspondingAuthor, userId);
			const isMainAuthor = matchesUser(p.mainAuthor, userId);
			const isCoAuthor = (p.coAuthors ?? []).some((author) => matchesUser(author, userId));

			const isHubReviewer =
				typeof p.hubId === 'object' &&
				Array.isArray(p.hubId?.reviewers) &&
				p.hubId.reviewers.some((reviewer) => matchesUser(reviewer, userId));
			const isHubOwner = typeof p.hubId === 'object' && matchesUser(p.hubId?.createdBy, userId);
			const isPaperInHub = !!p.hubId;
			const isAcceptedForReview = p.isAcceptedForReview === true;

			const isUnderNegotiation = p.status === 'reviewer assignment';
			const isInvolved = isAuthor || isCoAuthor || isMainAuthor;

			const canSeeWithoutHub = !isPaperInHub && isUnderNegotiation && !isInvolved;
			const canSeeWithHub =
				isPaperInHub &&
				isUnderNegotiation &&
				(isHubReviewer || isHubOwner || isAcceptedForReview) &&
				!isInvolved;

			return canSeeWithoutHub || canSeeWithHub;
		})
		.map((paper) => ({
			...paper,
			isHubPaper:
				typeof paper.hubId === 'object' &&
				Array.isArray(paper.hubId?.reviewers) &&
				paper.hubId.reviewers.some((reviewer) => matchesUser(reviewer, user.id))
		}));

	console.log(papersPool);
	
	// Filtrar papers "in review" - APENAS revisores designados, revisores do hub ou dono do hub (autores NÃO veem aqui)
	let inReview = papers.filter((p: Paper) => {
		if (p.status !== 'in review') return false;
		
		const userId = user.id?.toString();
		
		// Verifica se é dono do hub
		const isHubOwner = typeof p.hubId === 'object' && matchesUser(p.hubId?.createdBy, userId);
		
		// Verifica se é revisor do hub
		const isHubReviewer =
			typeof p.hubId === 'object' &&
			Array.isArray(p.hubId?.reviewers) &&
			p.hubId.reviewers.some((reviewer) => matchesUser(reviewer, userId));
		
		// Verifica se é revisor designado
		const isReviewer = p.peer_review?.responses?.some(
			(r) =>
				matchesUser(r.reviewerId, userId) && (r.status === 'accepted' || r.status === 'completed')
		);
		
		return isReviewer || isHubReviewer || isHubOwner;
	});
	
	// Filtrar papers "needing corrections" - APENAS revisores designados, revisores do hub ou dono do hub (autores NÃO veem aqui)
	let correction = papers.filter((p: Paper) => {
		if (p.status !== 'needing corrections') return false;
		
		const userId = user.id?.toString();
		
		// Verifica se é dono do hub
		const isHubOwner = typeof p.hubId === 'object' && matchesUser(p.hubId?.createdBy, userId);
		
		// Verifica se é revisor do hub
		const isHubReviewer =
			typeof p.hubId === 'object' &&
			Array.isArray(p.hubId?.reviewers) &&
			p.hubId.reviewers.some((reviewer) => matchesUser(reviewer, userId));
		
		// Verifica se é revisor designado
		const isReviewer = p.peer_review?.responses?.some(
			(r) =>
				matchesUser(r.reviewerId, userId) && (r.status === 'accepted' || r.status === 'completed')
		);
		
		return isReviewer || isHubReviewer || isHubOwner;
	});
	
	// Filtrar papers "published" - apenas os que o usuário revisou (incluindo papers do hub)
	let reviewed = papers.filter((p: Paper) => {
		if (p.status !== 'published') return false;
		
		const userId = user.id?.toString();
		
		// Verificar se o usuário completou uma revisão deste paper
		const hasCompleted = p.peer_review?.responses?.some(
			(r) => matchesUser(r.reviewerId, userId) && r.status === 'completed'
		);
		
		return hasCompleted;
	});

	let papersData = [papersPool, inReview, correction, reviewed];
	let publishData = {
		tabs,
		reviewerInvitations,
		papersData,
		reviews,
		user
	};
</script>

<div class="container page p-4 m-auto">
	<ReviewPage data={publishData}>
		{#snippet requested()}
			<div class="text-surface-900 w-full">
				<PaperPool rota={'/review/paperspool'} papersData={publishData} {user}></PaperPool>
			</div>
		{/snippet}
	</ReviewPage>
</div>
<!-- <div class="container page p-4 m-auto">
	<ReviewPage {tabs} {papers}>
		<! -- Slot para reviewRequested -- >
		<div slot="requested" class="text-surface-900 w-full">
			<PaperPool papersData={publishData} {user}></PaperPool>
		</div>
	</ReviewPage>
</div> -->
