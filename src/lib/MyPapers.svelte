<script lang="ts">
	import type { Paper } from './types/Paper';

	export let papersData: Paper[];
	export let rota:string = '/articles'
	// let user; // Selecionar o primeiro usuário na lista para demonstração
</script>

<div class="container">
	<!-- Navbar -->

	<section class="">
		<dl class="list-dl">
			{#each papersData as paper}
				<a data-sveltekit-reload href="{rota}/{paper.id}" class="flex flex-col gap-2 hover:text-secondary-500">
					<div class="flex items-center space-x-4 p-2 bg-gray-100 rounded-lg">
						<span class="badge bg-primary-500">💀</span>
						<span class="flex-auto">
							<button><dt class="font-bold">{paper.title}</dt></button>
							<!-- <p>Status: {paper.status}</p> --> <!-- Exibe o status do artigo -->
							<!-- <dd>{paper.abstract}</dd> -->
						</span>
					</div>
				</a>
			{/each}
		</dl>
	</section>
</div>
