<script lang="ts">
	import mammoth from 'mammoth';
	import sanitizeHtml from 'sanitize-html';

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
			content = sanitizeHtml(result.value);
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
		onchange={(event) => {
			const target = event.currentTarget;
			if (target instanceof HTMLInputElement) file = target.files?.[0] ?? null;
		}}
		class="border rounded px-4 py-2"
	/>

	<button onclick={handleUpload} class="bg-blue-600 text-white px-4 py-2 rounded">
		Testar Extração
	</button>

	{#if error}
		<p class="text-red-500">{error}</p>
	{/if}

	{#if content}
		<div class="mt-4 border rounded p-4 bg-white">
			<h2 class="font-bold mb-2">Conteúdo extraído:</h2>
			<div class="prose max-w-none">{@html content}</div>
		</div>
	{/if}
</div>
