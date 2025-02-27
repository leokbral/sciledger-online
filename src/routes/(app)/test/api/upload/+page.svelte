<script lang="ts">
	import { FileDropzone } from '@skeletonlabs/skeleton';

	let file: File | null = null;
	let files: FileList;

	const handleFileChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			file = target.files[0];
			// Você pode agora fazer o upload do arquivo
		}
	};

	function onChangeHandler(e: Event): void {
		console.log('file data:', e);
	}

	const uploadFile = async () => {
		if (file) {
      console.log(file)
			const formData = new FormData();
			formData.append('pdf', file);

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				const result = await response.json();
				if (result.success) {
					console.log('File uploaded successfully');
				} else {
					console.error('Upload failed:', result.error);
				}
			} catch (error) {
				console.error('Error uploading file:', error);
			}
		}
	};
</script>

<input type="file" accept=".pdf" on:change={handleFileChange} />


<FileDropzone name="files" bind:files on:change={onChangeHandler}>Upload</FileDropzone>
<button class="btn variant-filled-primary" on:click={uploadFile}>Upload</button>