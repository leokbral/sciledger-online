<script lang="ts">
	import { TagsInput, FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { Author } from '../../types/Author';
	import type { User } from '$lib/types/User';
	import { writable } from 'svelte/store';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import { page } from '$app/state';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';
	import PapersImages from '$lib/components/PapersImages.svelte';
	import Autocomplete from '$lib/components/Autocomplete.svelte';

	import IconDropzone from '@lucide/svelte/icons/image-plus';
	import IconFile from '@lucide/svelte/icons/paperclip';
	import IconRemove from '@lucide/svelte/icons/circle-x';

	let fileName = $state('');
	let pdfPaperPreview = $state();
	let pdfFile: File | null = $state(null);
	// Add these new variables
	let docxPreview = $state();
	let docxFile: File | null = $state(null);

	interface Props {
		authorsOptions: any;
		author: User;
		inicialValue?: PaperPublishStoreData;
		savePaper: (paper: PaperPublishStoreData) => void;
	}

	let {
		authorsOptions = $bindable(),
		author,
		inicialValue = {
			title: '',
			authors: [],
			mainAuthor: null,
			abstract: '', //{ time: Date.now(), blocks: [] },
			coAuthors: [], //{ time: Date.now(), blocks: [] },
			id: '', // ID único gerado para o paper
			correspondingAuthor: author, // Autor correspondente como UUID
			reviewers: [], // Lista de revisores como UUIDs
			keywords: [],
			content: '',
			pdfUrl: '',
			paperPictures: [], // Alterado de articlePictures para paperPictures
			citations: [], // Lista de citações como UUIDs
			likes: [], // Lista de usuários que curtiram como UUIDs
			comments: [], // Lista de comentários como UUIDs
			tags: [],
			status: 'draft',
			price: 0,
			score: 0,
			submittedBy: author,
			peer_review: {
				reviewType: 'open',
				assignedReviewers: [],
				responses: []
			},
			_id: ''
		},
		savePaper
	}: Props = $props();

	export const store = writable<PaperPublishStoreData>(inicialValue);

	// let files: FileList = $state();

	let inputAuthor = $state('');
	let inputAuthorList = $state(inicialValue.authors.map((a) => a.username) || []);
	let selected = $state({ value: '' });
	let content = $state(inicialValue.content || '');
	// let inputComponent: TagsInput = $state();

	authorsOptions = authorsOptions.map((a: User) => {
		return { ...a, label: a.username };
	});

	// function onInputChipSelect(event: CustomEvent<AutocompleteOption<string>>): void {
	// 	inputAuthor = event.detail.label;
	// 	inputComponent.addChip(inputAuthor);
	// 	inputAuthor = '';
	// }

	const onInputValueChange = (e: any) => {
		// ={(e) => (inputAuthorList = e.value)}
		console.log('chamou', e);
		inputAuthor = e.inputValue;
		// inputSkillList = e.value
	};

	function onInvalidHandler(event: any): void {
		console.log(event.reason);
		// toastStore.trigger({
		// 	message: `"${event.detail.input}" é um valor inválido. Por favor tente novamente!`,
		// 	background: 'preset-filled-error-500'
		// });
	}

	function onRemoveHandler(event: any): void {
		$store.authors = authorsOptions.filter((a: Author) => inputAuthorList.includes(a.id));
	}

	interface ValidateArgs {
		inputValue: string;
		// value: string[];
	}

	function isValidAuthor(value: ValidateArgs): boolean {
		return authorsOptions.some((option: User) => option.username === value.inputValue);
	}

	async function onChangeHandler(event: any): Promise<void> {
		const file = event.target?.files[0];

		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			fileName = file.name;
		}
	}

	// async function uploadFile() {
	// 	if (!pdfFile) {
	// 		console.log('Sem arquivos');
	// 		return { result: 'no_file' };
	// 	}

	// 	console.log('chamou uploadFile', pdfFile);

	// 	const formData = new FormData();
	// 	formData.append('file', pdfFile);

	// 	const response = await fetch('/api/pdfs/upload', {
	// 		method: 'POST',
	// 		body: formData
	// 	});

	// 	if (response.ok) {
	// 		const data = await response.json();
	// 		console.log(data);
	// 		//location.reload(); descomente para atualizar a pagina depois de salvar
	// 		return data;
	// 	} else {
	// 		console.error('Erro ao fazer upload do arquivo:', response.statusText);
	// 		console.log('response -> ', response);
	// 	}

	// 	return;
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
				//modify this to the server in VM
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
			content = data.html;

			// with open(filename, "w", encoding="utf-8") as f:
			// f.write(content)
			// downloadFile('./meuarquivo.html', content);
		} catch (error) {
			console.error('Error:', error);
			throw error;
		}
	}

	async function hdlSaveDraft(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		$store.authors = inputAuthorList.map(
			(i) => authorsOptions.filter((a: User) => a.username === i)[0]
		);
		$store.mainAuthor = $store.authors[0];
		$store.coAuthors = $store.authors.slice(1, $store.authors.length);
		//const uploadResult = await uploadFile();
		//console.log(uploadResult.result);
		// if (
		// 	!$store.pdfUrl ||
		// 	(uploadResult.result !== $store.pdfUrl && uploadResult.result !== 'no_file')
		// ) {
		// 	$store.pdfUrl = uploadResult.result;
		// }
		$store.pdfUrl = 'nope';
		const newImageIds = await Promise.all(
			imageItems
				.filter((item) => item.file)
				.map(async (item) => {
					const formData = new FormData();
					formData.append('file', item.file!);
					const response = await fetch('/api/images/upload', {
						method: 'POST',
						body: formData
					});
					const data = await response.json();
					return data.id;
				})
		);

		const existingImageIds = imageItems.filter((item) => item.id).map((item) => item.id!);
		const allImageIds = [...existingImageIds, ...newImageIds];

		$store.paperPictures = allImageIds;
		$store.content = content;

		console.log($store);
		savePaper($store);

		return $store;
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		$store.status = 'under negotiation';
		console.log($store);

		hdlSaveDraft(event)
		//savePaper($store);
	}

	// function save() {
	// 	// dispatch('savePaper', { store: $store });
	// }

	function generatePreview(event: any) {
		if (event.acceptedFiles.length === 0) {
			pdfPaperPreview = null;
			return;
		}
		const reader = new FileReader();
		reader.onload = (event) => {
			pdfPaperPreview = event.target?.result;
			// set the pdfPaperPreview as the src of an pdfPaperPreview element
			// console.log('event', pdfPaperPreview);
		};

		const _file = event.acceptedFiles[0];
		pdfFile = _file;
		reader.readAsDataURL(_file);
	}

	function generateDocxPreview(event: any) {
		if (event.acceptedFiles.length === 0) {
			docxPreview = null;
			return;
		}
		const reader = new FileReader();
		reader.onload = (event) => {
			docxPreview = event.target?.result;
		};

		const _file = event.acceptedFiles[0];
		docxFile = _file;
		reader.readAsDataURL(_file);
		convertDocument(_file).then(() => {
			console.log('Document converted successfully!');
		});
	}

	

	interface ImageItem {
		id?: string;
		file?: File;
		previewUrl: string;
	}

	let imageItems: ImageItem[] = $state(
		inicialValue.paperPictures.map((id) => ({
			id,
			previewUrl: `/api/images/${id}`
		}))
	);

	// $effect(() => {
	// 	if (paper?.paperPictures) {
	// 		imageItems = paper.paperPictures.map((id) => ({
	// 			id,
	// 			previewUrl: `/api/images/${id}`
	// 		}));
	// 	}
	// });

	async function handleImageUpload(event: any) {
		const file = event.acceptedFiles[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			imageItems = [...imageItems, { file, previewUrl: e.target?.result as string }];
		};
		reader.readAsDataURL(file);
	}

	function deleteImage(id: string) {
		imageItems = imageItems.filter((item) => item.id !== id);
	}
</script>

<main class="grid p-5">
	<div class="grid grid-cols-[1fr_1fr_1fr]">
		<div></div>
		<div class="flex justify-between gap-3">
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}>
				Save Draft
			</button>
			{#if page.url.pathname.includes('edit')}
				<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmit}>
					Submit Article
				</button>
			{/if}
		</div>
		<div></div>
	</div>
	<fieldset class="py-4 md:py-6">
		<section id="article-basic-info" class="flex flex-col items-center max-w-[700px] m-auto">
			<section class="mb-4 w-full">
				<input
					name="title"
					class="w-full p-2 border border-surface-300 rounded-lg text-lg"
					placeholder="Article Title"
					bind:value={$store.title}
				/>
			</section>
			<section id="authors" class="w-full flex flex-col gap-2">
				<TagsInput
					base="grid !h-auto "
					value={inputAuthorList}
					{onInputValueChange}
					onValueChange={(e) => (inputAuthorList = e.value)}
					onValueInvalid={onInvalidHandler}
					placeholder="Add author..."
					tagBackground="preset-filled-primary-500"
					classes="w-full max-w-[90vw] max-h-48 p-4 overflow-y-auto bg-surface-100 dark:bg-surface-900 rounded-lg"
					tagListClasses="gap-2 flex-wrap"
					inputClasses="!outline-none bg-transparent border-none"
					gap="gap-2"
					tagClasses="px-3 py-1 rounded-base gap-3"
					validate={isValidAuthor}
				></TagsInput>

				<div class="card w-full max-h-40 mb-4 overflow-y-auto" tabindex="-1">
					<Autocomplete
						input={inputAuthor}
						inputList={inputAuthorList}
						options={authorsOptions}
						denylist={inputAuthorList}
						emptyState="Author not found."
						regionEmpty="Não sei o que faz!!!!"
						onSelect={(option) => {
							// console.log('option', option.username, inputAuthorList);
							selected = option.username;

							inputAuthorList = [...inputAuthorList, option.username];
							// console.log('inputAuthorList', inputAuthorList);
						}}
					/>
				</div>
			</section>

			<section class="mb-4 w-full">
				<label for="abstract" class="block mb-1">Abstract</label>
				<RichTextEditor
					id="abstract"
					bind:content={$store.abstract}
					placeholder="Enter the abstract..."
				/>
			</section>

			<!-- {$store.abstract}
			<section class="mb-4 w-full">
				<label for="content" class="block mb-1">Content</label>
				<RichTextEditor
					id="content"
					bind:content={$store.content}
					placeholder="Enter the content..."
				/>
			</section> -->

			<!-- {$store.content} -->
			<section class="mb-4 w-full">
				<TagsInput
					value={$store.keywords}
					name="chips"
					placeholder="Enter article keywords..."
					onValueChange={(e) => ($store.keywords = e.value)}
					classes="bg-[rgb(240,240,240)] dark:bg-surface-900 rounded-lg"
				/>
			</section>

			<section>
				{#if page.url.pathname.includes('edit')}
					<!-- <PapersImages /> AKI MUDAR DEPOIS DA DEFESA -->
				{/if}
			</section>

			<div class="mt-4">
				<h5 class="text-lg font-semibold mb-2">Paper Images</h5>
				<div class="grid grid-cols-2 gap-4">
					<div class="border-2 border-dashed border-surface-300 rounded-lg p-4">
						<FileUpload
							name="paper-images"
							onFileChange={handleImageUpload}
							maxFiles={1}
							accept="image/*"
						>
							<button class="btn variant-filled">
								<span>Add Image</span>
							</button>
						</FileUpload>
					</div>

					{#if imageItems.length > 0}
						<div class="grid grid-cols-2 gap-2 mt-4">
							{#each imageItems as item, index}
								<div class="relative group">
									<img
										src={item.previewUrl}
										alt="Paper images"
										class="w-full h-32 object-cover rounded-lg"
									/>
									<button
										class="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
										aria-label="Delete image"
										onclick={(e) => {
											e.preventDefault();
											if (confirm('Are you sure you want to delete this image?')) {
												if (item.id) deleteImage(item.id);
												imageItems = imageItems.filter((_, i) => i !== index);
											}
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="my-4 w-full">
				<div>
					<!--  <FileUpload name="files" bind:files on:change={onChangeHandler}>
						 {#snippet message()}
							 {#if fileName}
								 <span class="font-bold text-surface-900-100">Selected file: {fileName}</span>
								
							{:else}
								 <span class="font-bold text-surface-900-100">Select a pdf</span>
								
							{/if}
							
						{/snippet}
						 {#snippet meta()}
							 <span class="text-surface-900-100">Ou solte os arquivos aqui</span>
							
						{/snippet}
						
					</FileUpload> -->

					<!-- PDF ESSE ABAIXO EH O BOM, descomente para usar -->
					<!-- <FileUpload
						name="files"
						accept="application/pdf"
						maxFiles={1}
						subtext="Attach only 1 file."
						onFileChange={generatePreview}
						onFileReject={console.error}
						classes="w-full"
						allowDrop
					>
						{#snippet iconInterface()}<IconDropzone class="size-8" />{/snippet}
						{#snippet iconFile()}<IconFile class="size-4" />{/snippet}
						{#snippet iconFileRemove()}<IconRemove class="size-4" />{/snippet}
					</FileUpload> -->

					<!-- DOCX -->
					<FileUpload
						name="docx-files"
						accept=".docx,.doc"
						maxFiles={1}
						subtext="Attach only 1 DOCX file."
						onFileChange={generateDocxPreview}
						onFileReject={console.error}
						classes="w-full"
						allowDrop
					>
						{#snippet iconInterface()}<IconDropzone class="size-8" />{/snippet}
						{#snippet iconFile()}<IconFile class="size-4" />{/snippet}
						{#snippet iconFileRemove()}<IconRemove class="size-4" />{/snippet}
					</FileUpload>
				</div>
			</div>
		</section>
		<section id="article-body" class="flex flex-col items-center max-w-[700px] m-auto"></section>

		<hr class="my-4" />
		<section id="pdf" class="md:max-w-[1280px] w-full px-3 flex flex-col m-auto">
			<section id="pdf" class=" p-4">
				<!-- <img
					src={image}
					alt="PDF"
					class="w-full h-auto object-cover rounded-lg shadow-lg"
					loading="lazy"
				/> -->
			</section>
			<hr class="" />
		</section>

		<!-- <div class="mb-8">
			<div class="border border-gray-300 p-4 h-[80vh] w-full">
				{#if pdfPaperPreview}
					<iframe src={`${pdfPaperPreview}`} title="PDF file" frameborder="1" class="h-full w-full"
					></iframe>
				{:else if $store.pdfUrl}
					<iframe
						src={`/api/pdfs/${$store.pdfUrl}`}
						title="PDF file"
						frameborder="1"
						class="h-full w-full"
					></iframe>
				{:else}
					<p class="text-center text-gray-500">No PDF selected</p>
				{/if}
			</div>
		</div> -->

		<div class="mb-8" id="docx">
			<div class="border border-gray-300 p-4 h-[80vh] w-full overflow-auto">
				{#if content}
					<div class="mt-4">
						{@html content}
					</div>
				{:else if docxPreview}
					<div class="mt-4 overflow-auto">
						<p class="text-center text-green-500">DOCX file selected</p>
						<!-- Note: Browsers cannot directly preview DOCX files -->
						<p class="text-center text-gray-500 text-sm">Preview not available for DOCX files</p>
					</div>
				{:else}
					<p class="text-center text-gray-500">No DOCX file selected</p>
				{/if}
			</div>
		</div>
	</fieldset>
</main>
