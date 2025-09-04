<script lang="ts">
	import PaperPool from '$lib/Pages/Paper/PaperPool.svelte';
	import ReviewPage from '$lib/Pages/Review/ReviewPage.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	// let papers = data.papers;
	// let papers: Paper[] = data.papers; //VERIFICAR ISSO!!!!

	let papers: Paper[] = data.papers.map((p: any) => ({
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
	// 		p.status === 'under negotiation' &&
	// 		(p.reviewers.includes(data.user.id) || p.correspondingAuthor === data.user.id)
	// );
	// let papersPool = papers.filter(
	// 		(p: Paper) => p.status === 'under negotiation'
	// 	);

	let user = data.user; //userProfiles[0];
	let reviewerInvitations = data.reviewerInvitations;

	let papersPool = papers
		.filter((p: Paper) => {
			const userId = user.id?.toString();
			const isReviewerRole = user.roles?.reviewer === true; // ← check if the user is really a reviewer

			if (!isReviewerRole) return false; // ← if not a reviewer, cannot see any paper

			const correspondingAuthorId = p.correspondingAuthor?.toString();
			const mainAuthorId = (
				typeof p.mainAuthor === 'object' ? (p.mainAuthor.id ?? p.mainAuthor._id) : p.mainAuthor
			)?.toString();
			const isAuthor = correspondingAuthorId === userId;
			const isMainAuthor = mainAuthorId === userId;
			const isCoAuthor = p.coAuthors?.some((author) => author.id?.toString() === userId);

			const isHubReviewer = typeof p.hubId === 'object' && p.hubId?.reviewers?.includes(userId);
			const isPaperInHub = !!p.hubId;

			const isUnderNegotiation = p.status === 'under negotiation';
			const isInvolved = isAuthor || isCoAuthor || isMainAuthor;

			const canSeeWithoutHub = !isPaperInHub && isUnderNegotiation && !isInvolved;
			const canSeeWithHub = isPaperInHub && isUnderNegotiation && isHubReviewer && !isInvolved;

			return canSeeWithoutHub || canSeeWithHub;
		})
		.map((paper) => ({
			...paper,
			isHubPaper: typeof paper.hubId === 'object' && paper.hubId?.reviewers?.includes(user.id)
		}));

	console.log(papersPool);
	let inReview = papers.filter((p: Paper) => p.status === 'in review');
	let correction = papers.filter((p: Paper) => p.status === 'needing corrections');
	let reviewed = papers.filter((p: Paper) => p.status === 'published');

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
