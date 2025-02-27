<script lang="ts">
	import { page } from '$app/stores';
	import PaperList from '$lib/PaperList/index.svelte';
	import { page_size } from '$lib/constants';
	import type { PageData } from './$types';

	export let data:PageData;
	//console.log('chamou page home', data.papers)

	let papers = data.papers;
	//console.log('papers ', papers)
	// let pages = Math.ceil(data.papers.papersCount / parseInt(page_size));
	let tags: string[] = [];

	$: p = +($page.url.searchParams.get('page') ?? '1');
	$: tag = $page.url.searchParams.get('tag');
	$: tab = $page.url.searchParams.get('tab') ?? 'all';
	$: page_link_base = tag ? `tag=${tag}` : `tab=${tab}`;
</script>

<svelte:head>
	<title>Break Free from Nature</title>
</svelte:head>

<div class="">
	<!-- {JSON.stringify(data.user)} -->
	{#if !data.user}
		<div class="banner w-screen bg-primary-900 p-8 text-white">
			<div class="flex flex-col items-center gap-4">
				<h1 class="h1">SciLedger</h1>
				<p>Blockchain Based Open Science</p>
				Consider rethinking your decision to invest substantial amounts
			</div>
		</div>
	{/if}

	<div class="container page max-w-[700px] p-4 m-auto">
		<div class="row">
			<div class="col-md-9">
				<h4 class="h4 px-4 text-primary-500 font font-semibold">Published Articles</h4>
				<hr class="mt-2 mb-4 !border-t-2" />
				<PaperList {papers} />
			</div>
		</div>
	</div> 
</div>
