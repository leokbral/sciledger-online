<script lang="ts">
	import { page } from '$app/stores';
	import PaperList from '$lib/PaperList/index.svelte';
	import { page_size } from '$lib/constants';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	//console.log('chamou page home', data.papers)

	let papers = data.papers;
	//console.log('papers ', papers)
	// let pages = Math.ceil(data.papers.papersCount / parseInt(page_size));
	let tags: string[] = [];

	let p = $derived(+($page.url.searchParams.get('page') ?? '1'));
	let tag = $derived($page.url.searchParams.get('tag'));
	let tab = $derived($page.url.searchParams.get('tab') ?? 'all');
	let page_link_base = $derived(tag ? `tag=${tag}` : `tab=${tab}`);
</script>

<div class="">
	<!-- {JSON.stringify(data.user)} -->
	

	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Published Articles</h4>
				<hr class="mt-2 mb-4 border-t-2!" />
				<PaperList {papers} />
			</div>
		</div>
	</div>
</div>
