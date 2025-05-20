<script lang="ts">
	import mammoth from 'mammoth';

	let file: File | null = null;
	let content = '';
	let error = '';

	async function handleUpload() {
		error = '';
		content = '';

		if (!file) {
			error = 'Selecione um arquivo .docx';
			return;
		}

		try {
			const arrayBuffer = await file.arrayBuffer();
			const result = await mammoth.convertToHtml({ arrayBuffer });
			content = result.value;
		} catch (err) {
			error = 'Erro ao processar o arquivo';
			console.error(err);
		}
	}
</script>

<div class="space-y-4">
	<input
		type="file"
		accept=".docx"
		on:change={(e) => (file = e.target.files?.[0] || null)}
		class="border rounded px-4 py-2"
	/>

	<button on:click={handleUpload} class="bg-blue-600 text-white px-4 py-2 rounded">
		Testar Extração
	</button>

	{#if error}
		<p class="text-red-500">{error}</p>
	{/if}

	{#if content}
		<div class="mt-4 border rounded p-4 bg-white">
			<h2 class="font-bold mb-2">Conteúdo extraído:</h2>
			<div class="prose max-w-none" innerHTML={content}></div>
		</div>
	{/if}
</div>
