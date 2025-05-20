<script lang="ts">
	import SERVER from '$lib/Pages/config';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let paper = data.paper;
	let src = SERVER + paper.pdfUrl;
</script>

<div>
	<h1>{paper.title}</h1>
	<p>{paper.abstract}</p>

	<h2>Autores</h2>
	<p>Autor Principal: {paper.mainAuthor}<!-- {paper.mainAuthor?.name} --></p>
	<p>Autor Correspondente: {paper.correspondingAuthor}<!-- {paper.correspondingAuthor?.name} --></p>
	<h3>Coautores:</h3>
	<ul>
		{#each paper.coAuthors as coAuthor}
			<li>{paper.correspondingAuthor}<!-- {coAuthor.name} --></li>
		{/each}
	</ul>

	<h3>Revisores:</h3>
	<ul>
		{#each paper.reviewers as reviewer}
			<li>{reviewer}<!-- {reviewer.name} --></li>
		{/each}
	</ul>

	<h2>Conteúdo</h2>
	<p>{paper.content}</p>

	<h2>PDF</h2>
	<div class="mb-8">
		<div class="mb-8">
			<!-- <h2 class="text-xl font-semibold mb-2"></h2> -->
			<div class="border border-gray-300 p-4 h-[80vh] w-full">
				<iframe {src} title="Arquivo" frameborder="1" class="h-full w-full"></iframe>
			</div>
		</div>
	</div>
</div>
