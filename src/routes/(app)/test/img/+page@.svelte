<script lang="ts">
	// import { writeFile } from 'fs/promises';
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';

	let imdFile: File | null = $state(null);
	let src = $state();

	// Load the document file
	function loadDocument(event: any) {
		console.log(event);
		const reader = new FileReader();
		reader.onload = (event) => {
			src = event?.target?.result;
			// set the image as the src of an image element
		};
		reader.readAsDataURL(event.acceptedFiles[0]);
		imdFile = event.acceptedFiles[0];
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

	async function saveImage(file: any) {
		if (!file) {
			console.error('No file provided');
			return;
		}

		const formData = new FormData();
		formData.append('file', file);
		console.log('File:', file);

		try {
			const response = await fetch('/api/images/upload', {
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
			console.log('saved image:', data);
			// src = data.html;

			// with open(filename, "w", encoding="utf-8") as f:
			// f.write(src)
			downloadFile('./img.png', src as string);
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
<button class="btn preset-filled" onclick={() => saveImage(imdFile)}>
	Convert Document
</button>

<hr class="m-10" />
<img src={src as string} alt="Converted " class="w-80 h-auto" />
