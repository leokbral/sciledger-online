<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const mncs = data.mncs;
	const pdfs = data.pdfs;
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<div class="flex space-between p-10 gap-4 w-screen ">
	<section class="w-96">
		{#each mncs as mnc}
			<article>
				<h2>{mnc.nome}</h2>
			</article>
		{/each}
	</section>

	<section>
		{#each pdfs as pdf}
			<article>
				<p>{pdf.title}</p>
			</article>
		{/each}
	</section>
</div>

<div>Login</div>