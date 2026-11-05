<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const pdfs = data.pdfs;

	let files: FileList | undefined = $state();

	async function onChangeHandler(event: Event): Promise<void> {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;
		files = target.files ?? undefined;
		const file = files?.[0];

		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.readAsDataURL(file);
		}
	}

	async function uploadFile() {
		if (!files?.length) {
			return;
		}
		const file = files[0];

		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/upload', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			const data = await response.json();
			//location.reload(); descomente para atualizar a pagina depois de salvar
		} else {
			console.error('Erro ao fazer upload do arquivo:', response.statusText);
		}

		return;
	}
</script>

<div class="m-auto card bg-black! text-surface-100 card-hover md:w-1/2">
	<header>
		<!-- <img src={imageUrl || ''} class="bg-black/50 w-full aspect-21/9" alt="Post" /> -->
		<div>
			<label class="block">
				<span class="font-bold text-surface-900-100">Selecione um pdf</span>
				<span class="block text-surface-900-100">Ou selecione os arquivos aqui</span>
				<input type="file" name="files" accept="application/pdf" multiple onchange={onChangeHandler} />
			</label>
		</div>
	</header>
</div>

<button class="btn preset-filled-primary-500" onclick={uploadFile}>Upload</button>

<div>
	<h1 class="h1">OS PDFS</h1>
	<section>
		{#each pdfs as pdf}
			<!-- <article>
				<p>{pdf.filename}</p>
				{JSON.stringify(pdf)}
			</article> -->
			<div class="mb-8">
				<h2 class="text-xl font-semibold mb-2">{pdf.filename}</h2>
				<div class="border border-gray-300 p-4 h-[80vh] w-full">
					<iframe
						src={`/api/pdfs/${pdf.metadata.id}`}
						title={pdf.filename}
						frameborder="1"
						class="h-full w-full"
					></iframe>
				</div>
			</div>
		{/each}
	</section>
</div>
