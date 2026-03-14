<script lang="ts">
	import PublishPage from '$lib/Pages/Publish/PublishPage.svelte';
	import type { Paper } from '$lib/types/Paper';

	interface Props {
		data: {
			papers: Paper[];
			user: unknown;
		};
	}

	let { data }: Props = $props();

	let papers: Paper[] = data.papers;
	let user = data.user;
	//console.log(papers)

	let tabs = [
		{
			name: 'Drafts',
			icon: 'material-symbols-light:draft-outline-rounded',
			rota: '/publish/edit'
		},
		{
			name: 'Reviewer Assignment',
			icon: 'hugeicons:conversation',
			rota: '/publish/reviewer-assignment'
		},
		{
			name: 'In Review',
			icon: 'material-symbols-light:rate-review-outline-rounded',
			rota: '/publish/inreview'
		},
		{
			name: 'Needing Corrections',
			icon: 'iconamoon:attention-circle-thin',
			rota: '/publish/corrections'
		},
		{
			name: 'Published',
			icon: 'material-symbols-light:check-rounded',
			rota: '/publish/published'
		}
	];

	let drafts = papers.filter((p: Paper) => p.status === 'draft');
	let underNegotiation = papers.filter((p: Paper) => p.status === 'reviewer assignment');
	let inReview = papers.filter((p: Paper) => p.status === 'in review');
	let needingCorrections = papers.filter((p: Paper) => p.status === 'needing corrections');
	let published = papers.filter((p: Paper) => p.status === 'published');

	let papersData = [drafts, underNegotiation, inReview, needingCorrections, published];

	let publishData = {
		tabs,
		papersData,
		user
	};

	//let src = 'https://www.biorxiv.org/content/10.1101/2020.05.28.119461v1.full.pdf';
</script>

<PublishPage data={publishData}></PublishPage>
