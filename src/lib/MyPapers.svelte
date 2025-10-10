<script lang="ts">
	import type { Paper } from './types/Paper';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';

	interface Props {
		papersData: Paper[];
		rota?: string;
		currentUser?: any;
	}

	let { papersData, rota = '/articles', currentUser }: Props = $props();
	// let user; // Selecionar o primeiro usuário na lista para demonstração
</script>

<div class="container">
	<!-- Navbar -->

	<section class="">
		<dl class="list-dl">
			{#each papersData as paper}
				<div class="flex flex-col gap-2 mb-4">
					<a data-sveltekit-reload href="{rota}/{paper.id}" class="flex flex-col gap-2 hover:text-secondary-500">
						<div class="flex items-center space-x-4 p-2 bg-gray-100 rounded-lg">
							<span class="badge bg-primary-500">💀</span>
							<span class="flex-auto">
								<button><dt class="font-bold">{paper.title}</dt></button>
								<p class="text-sm text-gray-600 capitalize">Status: {paper.status}</p>
							</span>
						</div>
					</a>
					
					<!-- Barra de Progresso (apenas para papers em revisão ou correção) -->
					{#if paper.status === 'in review' || paper.status === 'needing corrections'}
						<div class="ml-4">
							<CorrectionProgressBar 
								{paper} 
								{currentUser} 
								showDetails={true} 
								size="md" 
							/>
						</div>
					{/if}
				</div>
			{/each}
		</dl>
	</section>
</div>
