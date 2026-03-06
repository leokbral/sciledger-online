<script lang="ts">
	import PaperMeta from './PaperMeta.svelte';
	import CommentContainer from './CommentContainer.svelte';
	import SupplementaryMaterials from '$lib/components/SupplementaryMaterials.svelte';
	//import TaskRegisterPage from '$lib/Pages/article/ArticlePublishPage.svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();
	let paper = data.paper;
	let user = data.user;
	//console.log('TO POR AKI O', data);
</script>

<svelte:head>
	<title>{data.paper?.title}</title>
</svelte:head>

<div class="article-page container page max-w-[700px] p-4 m-auto">
	<div class="banner">
		<div class="container">
			<h1 class="text-2xl font-bold">{data.paper?.title}</h1>
			<PaperMeta {paper} user={data.user} />
		</div>
	</div>

	<div class="container page">
		<div class="row article-content">
			<div class="col-xs-12">
				<div>
					{@html data.paper?.content}
				</div>

				<ul class="tag-list">
					{#if data.paper}
						{#each data.paper.keywords as tag}
							<li class="tag-default tag-pill tag-outline">{tag}</li>
						{/each}
					{/if}
				</ul>
			</div>
		</div>

		<!-- Supplementary Materials Section -->
		{#if data.paper?.supplementaryMaterials && data.paper.supplementaryMaterials.length > 0}
			<div class="row article-supplementary">
				<div class="col-xs-12">
					<SupplementaryMaterials materials={data.paper.supplementaryMaterials} />
				</div>
			</div>
		{/if}

		<hr />

		<div class="article-actions"></div>

		<div class="row">
			<CommentContainer comments={data.paper?.comments} {user} />
		</div>
	</div>
</div>
