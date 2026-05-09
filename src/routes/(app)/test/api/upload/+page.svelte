<script lang="ts">
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';

	let file: File | null = null;
	let files: FileList = $state();

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			file = target.files[0];
			// Você pode agora fazer o upload do arquivo
		}
	};

	function onChangeHandler(e: Event): void {
	}

	const uploadFile = async () => {
		if (file) {
			const formData = new FormData();
			formData.append('pdf', file);

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();
				if (result.success) {
				} else {
					console.error('Upload failed:', result.error);
				}
			} catch (error) {
				console.error('Error uploading file:', error);
			}
		}
	};
</script>

<input type="file" accept=".pdf" onchange={handleFileChange} />


<FileUpload name="files" bind:files on:change={onChangeHandler}>Upload</FileUpload>
<button class="btn preset-filled-primary-500" onclick={uploadFile}>Upload</button>