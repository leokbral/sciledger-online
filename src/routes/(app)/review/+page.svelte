<script lang="ts">
	import PaperPool from '$lib/Pages/Paper/PaperPool.svelte';
	import ReviewPage from '$lib/Pages/Review/ReviewPage.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';

	export let data: PageData;
	// let papers = data.papers;
	let papers: Paper[] = data.papers;
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

	let papersPool = papers.filter((p: Paper) => p.status === 'under negotiation');
	let inReview = papers.filter((p: Paper) => p.status === 'in review');
	let correction = papers.filter((p: Paper) => p.status === 'needing corrections');
	let reviewed = papers.filter((p: Paper) => p.status === 'published');

	let user = data.user; //userProfiles[0];

	let papersData = [papersPool, inReview, correction, reviewed];
	let publishData = {
		tabs,
		papersData,
		reviews,
		user
	};
</script>

<div class="container page p-4 m-auto">
	<ReviewPage data={publishData}>
		<div slot="requested" class="text-surface-900 w-full">
			<PaperPool rota={'/review/paperspool'} papersData={publishData} {user}></PaperPool>
		</div>
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
