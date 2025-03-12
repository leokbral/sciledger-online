<script lang="ts">
	import {
		type AutocompleteOption, TagsInput, FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { Author } from '../../types/Author';
	import type { User } from '$lib/types/User';
	import { writable } from 'svelte/store';
	import type { Paper } from '$lib/types/Paper';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import { createEventDispatcher } from 'svelte';
	import { storeVercelProductionMode } from '$lib/stores/stores';
	import { page } from '$app/state';
	import SERVER from '../config';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';
	import PapersImages from '$lib/components/PapersImages.svelte';

	let fileName = $state('');

	const dispatch = createEventDispatcher();

	//console.log(authorsOptions);

	interface Props {
		authorsOptions: any;
		author: User;
		inicialValue?: PaperPublishStoreData;
	}

	let { authorsOptions = $bindable(), author, inicialValue = {
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
		peer_review: 'open'
	} }: Props = $props();

	export const store = writable<PaperPublishStoreData>(inicialValue);
	//console.log(inicialValue);

	// let title = '';
	// let abstract = '';
	// let keywords: string[] = [];
	// let mainAuthor = {};
	// let correspondingAuthor = author;
	// let coAuthors = [];
	// //
	// let authors: User[] = [];
	// let id = '';
	// let reviewers: User[] = [];
	// let content = '';
	// let pdfUrl = '';
	// let paperPictures: any = [];
	// let citations: string[] = [];
	// let likes: string[] = [];
	// let comments: string[] = [];
	// let tags: string[] = [];
	// let status = '';
	// let price = 0;
	// let score = 0;
	// let submittedBy = author;
	// let peer_review = 'open';

	//let file: File | null = null;
	let files: FileList = $state();

	const toastStore = getToastStore();

	let inputAuthor = $state('');
	let inputAuthorList: string[] = $state(inicialValue.authors.map((a) => a.username) || []);
	let inputComponent: TagsInput = $state();
	//console.log(inicialValue.authors)

	authorsOptions = authorsOptions.map((a: User) => {
		return { ...a, label: a.username };
	});

	function onInputChipSelect(event: CustomEvent<AutocompleteOption<string>>): void {
		inputAuthor = event.detail.label;
		inputComponent.addChip(inputAuthor);
		//console.log(inputAuthor, inputAuthorList)//authors.push() //authorsOptions.filter((a: User) => inputAuthorList.includes(a.username));
		inputAuthor = '';
	}

	function onInvalidHandler(event: any): void {
		toastStore.trigger({
			message: `"${event.detail.input}" é um valor inválido. Por favor tente novamente!`,
			background: 'preset-filled-error-500'
		});
	}

	function onRemoveHandler(event: any): void {
		$store.authors = authorsOptions.filter((a: Author) => inputAuthorList.includes(a.id));
	}

	function isValidAuthor(value: string): boolean {
		return authorsOptions.some((option: User) => option.username === value);
	}

	async function onChangeHandler(event: any): Promise<void> {
		const file = event.target?.files[0];

		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			fileName = file.name;
		}
	}

	async function uploadFile() {
		if (!files) {
			console.log('Sem arquivos');
			return { result: 'no_file' };
		}

		console.log('chamou uploadFile', files[0]);
		const file = files[0];

		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/pdfs/upload', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			const data = await response.json();
			console.log(data);
			//location.reload(); descomente para atualizar a pagina depois de salvar
			return data;
		} else {
			console.error('Erro ao fazer upload do arquivo:', response.statusText);
			console.log('response -> ', response);
		}

		return;
	}

	async function hdlSaveDraft(
		event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		//console.log($store);
		$store.authors = inputAuthorList.map(
			(i) => authorsOptions.filter((a: User) => a.username === i)[0]
		);
		$store.mainAuthor = $store.authors[0];
		$store.coAuthors = $store.authors.slice(1, $store.authors.length);
		//console.log(authors);

		const uploadResult = await uploadFile();
		console.log(uploadResult.result);

		if (
			!$store.pdfUrl ||
			(uploadResult.result !== $store.pdfUrl && uploadResult.result !== 'no_file')
		) {
			$store.pdfUrl = uploadResult.result;
		}

		// console.log(
		// 	correspondingAuthor,
		// 	title,
		// 	mainAuthor,
		// 	coAuthors,
		// 	abstract,
		// 	keywords,
		// 	authors,
		// 	id,
		// 	reviewers,
		// 	content,
		// 	pdfUrl,
		// 	paperPictures,
		// 	citations,
		// 	likes,
		// 	comments,
		// 	tags,
		// 	status,
		// 	price,
		// 	score,
		// 	submittedBy,
		// 	peer_review
		// );

		console.log($store);
		save();
		//return $store;
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		console.log($store);
		save();
	}

	function save() {
		dispatch('savePaper', { store: $store });
	}
</script>

<main class="grid p-5">
	<div class="grid grid-cols-[1fr_1fr_1fr]">
		<div></div>
		<div class="flex justify-between gap-3">
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}
				>Save Draft</button
			>
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmit}
				>Submit Article</button
			>
		</div>
		<div></div>
	</div>
	<fieldset class="py-4 md:py-6">
		<section id="article-basic-info" class="flex flex-col items-center max-w-[700px] m-auto">
			<section class="mb-4 w-full">
				<!-- <label for="title" class="block mb-1">Title</label> -->
				<input
					name="title"
					class="w-full p-2 border border-surface-300 rounded-lg text-lg"
					placeholder="Article Title"
					bind:value={$store.title}
				/>
			</section>
			<section id="skills" class="w-full flex flex-col gap-2">
				<TagsInput
					bind:this={inputComponent}
					bind:input={inputAuthor}
					bind:value={inputAuthorList}
					on:invalid={onInvalidHandler}
					on:remove={onRemoveHandler}
					allowUpperCase={true}
					validation={isValidAuthor}
					placeholder="Add author..."
					name="chips"
					class="card w-full max-h-48 p-4 overflow-y-auto"
				/>
				<div class="card w-full max-h-40 mb-4 p-4 overflow-y-auto" tabindex="-1">
					<Autocomplete
						bind:input={inputAuthor}
						options={authorsOptions}
						denylist={inputAuthorList}
						on:selection={onInputChipSelect}
						emptyState="Author not found."
						regionEmpty="Não sei o que faz!!!!"
					/>
				</div>
			</section>

			<!-- <section id="abstract" class="md:max-w-[1280px] w-full px-3 flex flex-col">
				<section id="abstract" class="px-4">
					<! -- <ArticleBody bind:this={articleAbstract} body={$store.abstract} placeholder="Abstract..."
					></ArticleBody> -- >
				</section>
			</section> -->

			<section class="mb-4 w-full">
				<label for="abstract" class="block mb-1">Abstract</label>
				<RichTextEditor bind:content={$store.abstract} placeholder="Enter the abstract..." />
			</section>

			<section class="mb-4 w-full">
				<TagsInput
					bind:value={$store.keywords}
					name="chips"
					placeholder="Enter article keywords..."
				/>
			</section>

			<!-- papers images section -->
			<section>
				{#if page.url.pathname.includes('edit')}
					<PapersImages />
				{/if}
			</section>

			<!-- < !-- <label for="peer_review" class="block mb-1">Peer Review Options</label>
			<select
				id="peer_review"
				name="peer_review"
				class="w-full p-2 border border-surface-300 rounded-lg"
				bind:value={$store.peer_review}
			>
				<option value="" disabled selected>Select peer review option</option>
				<option value="open">Open</option>
				<option value="selected">Selected</option>
			</select> -- >

			<section class="mb-4 w-full my-4">
				<label for="price" class="block mb-1">Price</label>
				<input
					id="price"
					type="number"
					step="0.01"
					class="w-full p-2 border border-surface-300 rounded-lg"
					placeholder="Enter price"
					bind:value={$store.price}
				/>
			</section> -->

			<div class="my-4 w-full">
				<!-- <label for="file">PDF File:</label>
				<input type="file" id="file" accept=".pdf" on:change={handleFileChange} /> -->
				<div>
					<FileUpload name="files" bind:files on:change={onChangeHandler}>
						{#snippet message()}
											
								{#if fileName}
									<span class="font-bold text-surface-900-100">Selected file: {fileName}</span>
								{:else}
									<span class="font-bold text-surface-900-100">Select a pdf</span>
								{/if}
							
											{/snippet}
						{#snippet meta()}
												<span class="text-surface-900-100">Ou solte os arquivos aqui</span
								>
											{/snippet}
					</FileUpload>
				</div>
			</div>
		</section>
		<section id="article-body" class="flex flex-col items-center max-w-[700px] m-auto"></section>

		<hr class="my-4" />
		<section id="pdf" class="md:max-w-[1280px] w-full px-3 flex flex-col m-auto">
			<section id="pdf" class=" p-4">
				<!-- <ArticleBody bind:this={articleBody} body={$store.body}></ArticleBody> -->
			</section>
			<hr class="" />
		</section>
		<div class="mb-8">
			<!-- <h2 class="text-xl font-semibold mb-2">{pdf.filename}</h2> -->
			<div class="border border-gray-300 p-4 h-[80vh] w-full">
				<iframe
					src={`/api/pdfs/${$store.pdfUrl}`}
					title="PDF file"
					frameborder="1"
					class="h-full w-full"
				></iframe>
			</div>
		</div>
	</fieldset>
</main>
