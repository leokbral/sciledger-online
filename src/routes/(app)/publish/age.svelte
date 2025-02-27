<script lang="ts">
	import { FileDropzone } from '@skeletonlabs/skeleton';

	let file: File | null = null;
	let files: FileList;

	// Campos do formulário
	let title = '';
	let abstract = '';
	let keywords = '';
	let mainAuthor = '';
	let correspondingAuthor = '';
	let coAuthors = '';
	let tags = '';

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			file = target.files[0];
		}
	};

	function onChangeHandler(e: Event): void {
		console.log('file data:', e);
	}

	const uploadFile = async () => {
		if (file) {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('title', title);
			formData.append('abstract', abstract);
			formData.append('keywords', keywords);
			formData.append('mainAuthor', mainAuthor);
			formData.append('correspondingAuthor', correspondingAuthor);
			formData.append('coAuthors', coAuthors);
			formData.append('tags', tags);

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();
				if (result.success) {
					console.log('File and data uploaded successfully');
				} else {
					console.error('Upload failed:', result.error);
				}
			} catch (error) {
				console.error('Error uploading file:', error);
			}
		}
	};
</script>

<!-- Formulário de envio -->
<form on:submit|preventDefault={uploadFile}>
	<div>
		<label for="title">Title:</label>
		<input type="text" id="title" bind:value={title} required />
	</div>

	<div>
		<label for="abstract">Abstract:</label>
		<textarea id="abstract" bind:value={abstract} required></textarea>
	</div>

	<div>
		<label for="keywords">Keywords (comma-separated):</label>
		<input type="text" id="keywords" bind:value={keywords} />
	</div>

	<div>
		<label for="mainAuthor">Main Author:</label>
		<input type="text" id="mainAuthor" bind:value={mainAuthor} required />
	</div>

	<div>
		<label for="correspondingAuthor">Corresponding Author:</label>
		<input type="text" id="correspondingAuthor" bind:value={correspondingAuthor} required />
	</div>

	<div>
		<label for="coAuthors">Co-Authors (comma-separated):</label>
		<input type="text" id="coAuthors" bind:value={coAuthors} />
	</div>

	<div>
		<label for="tags">Tags (comma-separated):</label>
		<input type="text" id="tags" bind:value={tags} />
	</div>

	<div>
		<label for="file">PDF File:</label>
		<input type="file" id="file" accept=".pdf" on:change={handleFileChange} />
	</div>

	<FileDropzone name="files" bind:files on:change={onChangeHandler}>Upload</FileDropzone>

	<button type="submit" class="btn variant-filled-primary">Submit Article</button>
</form>
