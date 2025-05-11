<script lang="ts">
	import HubPage from '$lib/Pages/Hub/HubPage.svelte';
	import PaperPool from '$lib/Pages/Paper/PaperPool.svelte';
	import ReviewPage from '$lib/Pages/Review/ReviewPage.svelte';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';
</script>

<div class="container page p-4 m-auto">
	<HubPage></HubPage>

	<!-- <ReviewPage data={publishData}>
		{#snippet requested()}
				<div  class="text-surface-900 w-full">
				<PaperPool rota={'/review/paperspool'} papersData={publishData} {user}></PaperPool>
			</div>
			{/snippet}	
	</ReviewPage> -->
</div>
<!-- <div class="container page p-4 m-auto">
	<ReviewPage {tabs} {papers}>
		<! -- Slot para reviewRequested -- >
		<div slot="requested" class="text-surface-900 w-full">
			<PaperPool papersData={publishData} {user}></PaperPool>
		</div>
	</ReviewPage>
</div> -->
