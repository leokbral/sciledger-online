<script lang="ts">
	// import { writeFile } from 'fs/promises';
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';

	
	let papertest: File | null = $state(null);
	let convertedHtml = $state('');

	// Load the document file
	function loadDocument(event: any) {
		console.log(event);
		papertest = event.acceptedFiles[0];
	}

	function downloadFile(filename: string, content: string) {
		const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();

		// Libera o objeto URL da memória
		URL.revokeObjectURL(url);
	}

	// async function saveToFile(filename: string, convertedHtml: string): Promise<void> {
	// 	try {
	// 		await writeFile(filename, convertedHtml, { encoding: 'utf-8' });
	// 		console.log('Arquivo salvo com sucesso!');
	// 	} catch (err) {
	// 		console.error('Erro ao salvar o arquivo:', err);
	// 	}
	// }

	async function convertDocument(file: any) {
		if (!file) {
			console.error('No file provided');
			return;
		}

		const formData = new FormData();
		formData.append('file', file);
		console.log('File:', file);

		try {
			const response = await fetch('http://127.0.0.1:8000/api/convert', {
				method: 'POST',
				body: formData,
				mode: 'cors',
				credentials: 'same-origin',
				headers: {
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Conversion failed: ${response.status}`);
			}

			const data = await response.json();
			convertedHtml = data.html;

			// with open(filename, "w", encoding="utf-8") as f:
			// f.write(convertedHtml)
			downloadFile('./meuarquivo.html', convertedHtml);
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	}
</script>

<FileUpload name="example-button" onFileChange={loadDocument} maxFiles={2}>
	<button class="btn preset-filled">
		<span>Select File</span>
	</button>
</FileUpload>
<button class="btn preset-filled" onclick={() => convertDocument(papertest)}>
	Convert Document
</button>
{#if convertedHtml}
	{@html convertedHtml}
{/if}
<hr class="m-10">
{convertedHtml}