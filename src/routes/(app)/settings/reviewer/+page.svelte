<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<div class="card border rounded-lg p-5 space-y-2">
	<h2 class="text-lg font-semibold">Perfil de Revisor</h2>
	<p class="text-sm text-surface-600-400">
		{#if data.isReviewer}
			Revisor habilitado
		{:else}
			Seu usuario ainda nao esta habilitado como revisor
		{/if}
	</p>
</div>
