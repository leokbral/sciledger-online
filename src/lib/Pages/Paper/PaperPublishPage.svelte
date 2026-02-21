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
	import OrcidProfile from '$lib/components/OrcidProfile/OrcidProfile.svelte';
	import { SCOPUS_AREAS, getSubAreasForArea, getAllAreaNames } from '$lib/constants/scopusAreas';

	let fileName = $state('');
	let pdfPaperPreview = $state();
	let pdfFile: File | null = $state(null);
	// Add these new variables
	let docxPreview = $state();
	let docxFile: File | null = $state(null);

	// ORCID search variables
	let orcidId = $state('');
	let orcidProfile = $state(null);
	let isSearchingOrcid = $state(false);
	let orcidError = $state('');
	let isAddingOrcidUser = $state(false);
	let selectedOrcidProfile = $state(false);

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

	// Scopus classification variables - now supporting multiple classifications
	interface ScopusClassification {
		area: string;
		subArea: string;
	}
	
	let scopusClassifications = $state<ScopusClassification[]>(
		inicialValue.scopusArea && inicialValue.scopusSubArea
			? [{ area: inicialValue.scopusArea, subArea: inicialValue.scopusSubArea }]
			: []
	);
	
	// Temporary variables for adding new classification
	let newScopusArea = $state('');
	let newScopusSubArea = $state('');
	
	// Derive sub-areas based on selected area
	let availableScopusSubAreas = $derived(
		newScopusArea ? getSubAreasForArea(newScopusArea) : []
	);

	// Handler to update available sub-areas when area changes
	function handleScopusAreaChange() {
		// Reset sub-area when area changes
		if (newScopusArea) {
			const subAreas = getSubAreasForArea(newScopusArea);
			if (!subAreas.find((sub) => sub.name === newScopusSubArea)) {
				newScopusSubArea = '';
			}
		} else {
			newScopusSubArea = '';
		}
	}

	// Add new classification
	function addScopusClassification() {
		if (newScopusArea && newScopusSubArea) {
			// Check if this combination already exists
			const exists = scopusClassifications.some(
				(c) => c.area === newScopusArea && c.subArea === newScopusSubArea
			);
			
			if (!exists) {
				scopusClassifications = [
					...scopusClassifications,
					{ area: newScopusArea, subArea: newScopusSubArea }
				];
				
				// Update store (keep backward compatibility by storing first classification)
				if (scopusClassifications.length > 0) {
					$store.scopusArea = scopusClassifications[0].area;
					$store.scopusSubArea = scopusClassifications[0].subArea;
				}
				
				// Store all classifications (if your data model supports it)
				// @ts-ignore
				$store.scopusClassifications = scopusClassifications;
				
				// Reset form
				newScopusArea = '';
				newScopusSubArea = '';
			} else {
				alert('This classification has already been added.');
			}
		}
	}
	
	// Remove classification
	function removeScopusClassification(index: number) {
		scopusClassifications = scopusClassifications.filter((_, i) => i !== index);
		
		// Update store
		if (scopusClassifications.length > 0) {
			$store.scopusArea = scopusClassifications[0].area;
			$store.scopusSubArea = scopusClassifications[0].subArea;
		} else {
			$store.scopusArea = '';
			$store.scopusSubArea = '';
		}
		
		// @ts-ignore
		$store.scopusClassifications = scopusClassifications;
	}

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

	// Function to extract abstract from HTML content using regex
	function extractAbstractFromHtml(html: string): string {
		if (!html) return '';

		let abstractContent = '';

		// First try: Look for content after "Abstract" heading
		const abstractHeadingRegex = /<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;
		const abstractHeadingMatch = abstractHeadingRegex.exec(html);

		if (abstractHeadingMatch) {
			// Get everything after the abstract heading
			const startIndex = abstractHeadingMatch.index + abstractHeadingMatch[0].length;
			const afterHeading = html.substring(startIndex);

			// Extract content until next heading or a certain length
			const contentRegex = /<p[^>]*>([^<]*)<\/p>/gi;
			const paragraphs: string[] = [];
			let match;
			let wordCount = 0;

			while ((match = contentRegex.exec(afterHeading)) !== null && wordCount < 350) {
				const text = match[1].trim().replace(/<[^>]*>/g, '').trim();
				if (text && text.length > 20) {
					paragraphs.push(text);
					wordCount += text.split(/\s+/).length;
				}
				// Stop if we hit another heading
				if (afterHeading.substring(match.index).match(/<h[1-6]/i)) {
					break;
				}
			}

			if (paragraphs.length > 0) {
				abstractContent = paragraphs.join('\n\n');
			}
		}

		// Fallback: Extract first few paragraphs if abstract not found
		if (!abstractContent) {
			const paragraphRegex = /<p[^>]*>([^<]*)<\/p>/gi;
			const firstParagraphs: string[] = [];
			let match;
			let wordCount = 0;

			while ((match = paragraphRegex.exec(html)) !== null) {
				const text = match[1].trim().replace(/<[^>]*>/g, '').trim();
				if (text && text.length > 30) {
					firstParagraphs.push(text);
					wordCount += text.split(/\s+/).length;
					// Stop after collecting 100-150 words
					if (wordCount > 100) {
						break;
					}
				}
			}

			// Only use if we got reasonable amount of text
			if (firstParagraphs.length > 0 && wordCount > 50 && wordCount < 400) {
				abstractContent = firstParagraphs.join('\n\n');
			}
		}

		console.log('Extracted abstract:', abstractContent.substring(0, 100) + '...');
		return abstractContent;
	}

	function extractKeywordsFromHtml(html: string): string[] {
		if (!html) return [];

		const cleanText = (input: string) =>
			input
				.replace(/<[^>]*>/g, '')
				.replace(/&nbsp;/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();

		const abstractHeadingRegex =
			/<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;
		const mainHeadingRegex = /<h[1-6][^>]*>\s*(?:Main|MAIN|main)\s*<\/h[1-6]>/i;
		const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;

		const abstractMatch = abstractHeadingRegex.exec(html);
		if (!abstractMatch) {
			console.log('Keywords: abstract heading not found');
			return [];
		}

		const afterAbstract = html.substring(abstractMatch.index + abstractMatch[0].length);
		const mainMatch = mainHeadingRegex.exec(afterAbstract);
		const sectionBetweenAbstractAndMain = mainMatch
			? afterAbstract.substring(0, mainMatch.index)
			: afterAbstract;

		const paragraphs: string[] = [];
		let match: RegExpExecArray | null;
		while ((match = paragraphRegex.exec(sectionBetweenAbstractAndMain)) !== null) {
			const text = cleanText(match[1]);
			if (text.length > 0) paragraphs.push(text);
		}

		if (paragraphs.length < 2) {
			console.log('Keywords: not enough paragraphs between abstract and main');
			return [];
		}

		let keywordsParagraph = paragraphs[1];

		if (!keywordsParagraph.includes(',') && paragraphs.length > 2) {
			const withCommas = paragraphs.slice(1).find((p) => p.includes(','));
			if (withCommas) keywordsParagraph = withCommas;
		}

		keywordsParagraph = keywordsParagraph
			.replace(/^\s*(keywords?|palavras-chave)\s*[:\-]?\s*/i, '')
			.trim();

		const keywords = keywordsParagraph
			.split(',')
			.map((k) => k.trim())
			.filter((k) => k.length > 0);

		const uniqueKeywords = [...new Set(keywords)];
		console.log('Extracted keywords:', uniqueKeywords);
		return uniqueKeywords;
	}

	async function convertDocument(file: any) {
		if (!file) {
			console.error('No file provided');
			return;
		}

		const formData = new FormData();
		formData.append('file', file);
		console.log('File:', file);

		try {
			// const response = await fetch('http://127.0.0.1:8000/api/convert', {
			const response = await fetch('https://scideep.imd.ufrn.br/dth/api/convert', {
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
			console.log('HTML conversion successful');

			// Automatically extract and fill abstract
			if (data.html) {
				const extractedAbstract = extractAbstractFromHtml(data.html);
				console.log('Checking if should fill abstract... Current:', $store.abstract ? 'has value' : 'empty');
				
				if (extractedAbstract && !$store.abstract) {
					$store.abstract = extractedAbstract;
					console.log('✅ Abstract automatically filled from DOCX');
					console.log('Abstract content:', $store.abstract.substring(0, 150) + '...');
				} else if (extractedAbstract && $store.abstract) {
					console.log('⚠️ Abstract field already has content, not overwriting');
				} else {
					console.log('❌ Could not extract abstract from document');
				}

				const extractedKeywords = extractKeywordsFromHtml(data.html);
				console.log(
					'Checking if should fill keywords... Current:',
					$store.keywords?.length ? 'has value' : 'empty'
				);

				if (extractedKeywords.length > 0 && (!$store.keywords || $store.keywords.length === 0)) {
					$store.keywords = extractedKeywords;
					console.log('✅ Keywords automatically filled from DOCX:', $store.keywords);
				} else if (extractedKeywords.length > 0 && $store.keywords?.length) {
					console.log('⚠️ Keywords field already has content, not overwriting');
				} else {
					console.log('❌ Could not extract keywords from document');
				}
			}

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
					formData.append('image', item.file!);
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

		hdlSaveDraft(event);
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

	// Function to search ORCID profile
	async function searchOrcidProfile() {
		if (!orcidId.trim()) {
			orcidError = 'Please enter an ORCID ID';
			return;
		}

		// Validate ORCID format (basic validation)
		const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
		if (!orcidRegex.test(orcidId)) {
			orcidError = 'Invalid ORCID format. Use format: 0000-0000-0000-0000';
			return;
		}

		isSearchingOrcid = true;
		orcidError = '';

		try {
			const response = await fetch(`/api/orcid/${orcidId}`);

			if (!response.ok) {
				throw new Error('ORCID profile not found');
			}

			const data = await response.json();
			orcidProfile = data.profile;
			orcidError = '';
		} catch (error) {
			console.error('Error fetching ORCID profile:', error);
			orcidError = 'Error fetching ORCID profile. Please check the ID and try again.';
			orcidProfile = null;
		} finally {
			isSearchingOrcid = false;
		}
	}

	// Function to handle ORCID profile selection
	function handleOrcidSelection(event: any) {
		selectedOrcidProfile = event.detail.isSelected;
	}

	// Function to add ORCID profile as co-author
	async function addOrcidAsCoauthor(event: any) {
		const { profile, email } = event.detail;

		if (!selectedOrcidProfile) {
			orcidError = 'Please select the profile first';
			return;
		}

		isAddingOrcidUser = true;

		try {
			const response = await fetch('/api/orcid/add-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					orcidProfile: profile,
					email: email
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				if (response.status === 409) {
					// User already exists, add them anyway
					const existingUser = errorData.user;
					authorsOptions = [...authorsOptions, { ...existingUser, label: existingUser.username }];
					inputAuthorList = [...inputAuthorList, existingUser.username];
					clearOrcidSearch();
					alert(
						`${existingUser.firstName} ${existingUser.lastName} added as co-author (existing user)!`
					);
					return;
				}
				throw new Error(errorData.error || 'Failed to add ORCID user');
			}

			const data = await response.json();
			const newUser = data.user;

			// Adicionar o novo usuário às opções de autores
			authorsOptions = [...authorsOptions, { ...newUser, label: newUser.username }];

			// Adicionar o usuário à lista de autores
			inputAuthorList = [...inputAuthorList, newUser.username];

			// Limpar a busca ORCID
			clearOrcidSearch();

			if (newUser.email) {
				try {
					await fetch('/api/email/coauthor', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							coAuthorName: `${newUser.firstName} ${newUser.lastName}`,
							coAuthorEmail: newUser.email,
							inviterName: `${author.firstName} ${author.lastName}`,
							projectTitle: $store.title,
							loginUrl: 'https://scideep.imd.ufrn.br/recovery'
						})
					});
				} catch (emailError) {
					console.warn('Falha ao enviar e-mail ao coautor:', emailError);
				}
			}

			// Mostrar mensagem de sucesso
			const emailInfo = data.hasEmail ? 'with email' : 'as pre-registration (no email)';
			const passwordInfo = data.tempPassword ? ` Temporary password: ${data.tempPassword}` : '';
			alert(
				`${newUser.firstName} ${newUser.lastName} added as co-author successfully ${emailInfo}!${passwordInfo}`
			);
		} catch (error) {
			console.error('Error adding ORCID user:', error);
			orcidError =
				error instanceof Error
					? error.message
					: 'Failed to add ORCID profile as co-author. Please try again.';
		} finally {
			isAddingOrcidUser = false;
		}
	}

	// Function to clear ORCID search
	function clearOrcidSearch() {
		orcidId = '';
		orcidProfile = null;
		orcidError = '';
		selectedOrcidProfile = false;
	}
</script>

<main class="grid p-5">
	<fieldset class="py-4 md:py-6">
		<section id="article-basic-info" class="flex flex-col items-center max-w-[700px] m-auto">
			<div class="mb-6 w-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
				<h2 class="text-xl font-bold text-primary-900 dark:text-primary-100 mb-2">Submit Your Paper</h2>
				<p class="text-sm text-primary-800 dark:text-primary-200">
					Fill out the form below to submit your paper for peer review. All fields marked with * are required.
					You can save your progress as a draft at any time using the "Save Draft" button at the bottom of the page.
				</p>
			</div>
			<section class="mb-4 w-full">
				<!-- <input
					name="title"
					class="w-full p-2 border border-surface-300 rounded-lg text-lg"
					placeholder="Article Title"
					bind:value={$store.title}
				/> -->
				<label for="title" class="block mb-1 font-semibold">Title *</label>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-2">
					Enter the full title of your paper. Be clear and descriptive.
				</p>
				<RichTextEditor
					id="title"
					bind:content={$store.title}
					placeholder="Article Title..."
					minHeight="80px"
				/>
			</section>
			<section id="authors" class="w-full flex flex-col gap-2">
				<label class="block mb-1 font-semibold">Authors *</label>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-2">
					Add all authors of this paper. Type the username and select from the dropdown, or use the ORCID search below to find and add co-authors.
				</p>
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

			<!-- ORCID Search Section -->
			<section class="mb-6 w-full">
				<div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border">
					<h3 class="text-lg font-semibold mb-3 text-surface-900 dark:text-surface-100">
						ORCID Profile Search & Add Co-authors
					</h3>
					<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
						Search for co-authors by their ORCID iD (e.g., 0000-0000-0000-0000). If they're not registered in the system, they'll be added automatically.
					</p>

					<div class="flex gap-2 mb-4">
						<div class="flex-1">
							<label for="orcid-input" class="block mb-1 text-sm font-medium"> ORCID ID </label>
							<input
								id="orcid-input"
								type="text"
								bind:value={orcidId}
								placeholder="0000-0000-0000-0000"
								class="w-full p-2 border border-surface-300 rounded-lg text-sm"
								disabled={isSearchingOrcid}
							/>
						</div>
						<div class="flex items-end gap-2">
							<button
								type="button"
								onclick={searchOrcidProfile}
								disabled={isSearchingOrcid || !orcidId.trim()}
								class="bg-primary-500 hover:bg-primary-600 disabled:bg-surface-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							>
								{#if isSearchingOrcid}
									Searching...
								{:else}
									Search
								{/if}
							</button>

							{#if orcidProfile || orcidId}
								<button
									type="button"
									onclick={clearOrcidSearch}
									disabled={isSearchingOrcid}
									class="bg-surface-500 hover:bg-surface-600 disabled:bg-surface-300 text-white px-3 py-2 rounded-lg text-sm transition-colors"
								>
									Clear
								</button>
							{/if}
						</div>
					</div>

					{#if orcidError}
						<div
							class="mb-3 p-3 bg-error-100 border border-error-300 text-error-700 rounded-lg text-sm"
						>
							{orcidError}
						</div>
					{/if}

					{#if isSearchingOrcid}
						<div class="flex items-center justify-center py-8">
							<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
							<span class="ml-2 text-sm text-surface-600">Searching ORCID profile...</span>
						</div>
					{/if}

					{#if orcidProfile}
						<div class="mt-4">
							<h4 class="text-md font-medium mb-2 text-surface-800 dark:text-surface-200">
								Found Profile:
							</h4>
							<OrcidProfile
								profile={orcidProfile}
								showAddButton={true}
								canSelect={true}
								isSelected={selectedOrcidProfile}
								isAdding={isAddingOrcidUser}
								on:select={handleOrcidSelection}
								on:addAsCoauthor={addOrcidAsCoauthor}
							/>
						</div>
					{/if}
				</div>
			</section>

			<section class="mb-4 w-full">
				<label for="abstract" class="block mb-1 font-semibold">Abstract *</label>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-2">
					Provide a concise summary of your paper, including the main objectives, methods, results, and conclusions (typically 150-300 words).
				</p>
				<RichTextEditor
					id="abstract"
					bind:content={$store.abstract}
					placeholder="Enter the abstract..."
				/>
			</section>

			<!-- Current Author Profile (if no ORCID search) -->
			<!-- {#if !orcidProfile}
				<OrcidProfile profile={author} />
			{/if} -->

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
				<label class="block mb-1 font-semibold">Keywords *</label>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-2">
					Add 3-6 keywords that describe your paper. Press Enter after each keyword to add it.
				</p>
				<TagsInput
					value={$store.keywords}
					name="chips"
					placeholder="Enter article keywords..."
					onValueChange={(e) => ($store.keywords = e.value)}
					classes="bg-[rgb(240,240,240)] dark:bg-surface-900 rounded-lg"
				/>
			</section>

			<!-- Scopus Classification Section - Multiple Classifications -->
			<section class="mb-6 w-full">
				<div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border">
					<h3 class="text-lg font-semibold mb-3 text-surface-900 dark:text-surface-100">
						Scopus Subject Classification *
					</h3>
					<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
						Add one or more subject classifications that best match your paper's content. You can add multiple areas if your paper is interdisciplinary.
					</p>
					
					<!-- Display added classifications -->
					{#if scopusClassifications.length > 0}
						<div class="mb-4 space-y-2">
							<label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
								Added Classifications:
							</label>
							<div class="flex flex-wrap gap-2">
								{#each scopusClassifications as classification, index}
									<div class="flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700 rounded-lg px-3 py-2 group hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors">
										<div class="flex flex-col">
											<span class="text-sm font-semibold text-primary-900 dark:text-primary-100">
												{classification.area}
											</span>
											<span class="text-xs text-primary-700 dark:text-primary-300">
												{classification.subArea}
											</span>
										</div>
										<button
											type="button"
											onclick={() => removeScopusClassification(index)}
											class="ml-2 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 transition-colors"
											title="Remove classification"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
					
					<!-- Form to add new classification -->
					<div class="bg-white dark:bg-surface-900 rounded-lg p-3 border border-surface-300 dark:border-surface-700">
						<label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
							Add New Classification:
						</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
							<!-- Scopus Area -->
							<div>
								<label for="new-scopus-area" class="block mb-1 text-xs font-medium text-surface-600 dark:text-surface-400">
									Subject Area
								</label>
								<select
									id="new-scopus-area"
									bind:value={newScopusArea}
									onchange={handleScopusAreaChange}
									class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								>
									<option value="">Select a subject area...</option>
									{#each getAllAreaNames() as areaName}
										<option value={areaName}>{areaName}</option>
									{/each}
								</select>
							</div>

							<!-- Scopus Sub-Area -->
							<div>
								<label for="new-scopus-subarea" class="block mb-1 text-xs font-medium text-surface-600 dark:text-surface-400">
									Subject Sub-Area
								</label>
								<select
									id="new-scopus-subarea"
									bind:value={newScopusSubArea}
									disabled={!newScopusArea}
									class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-800 disabled:bg-surface-200 dark:disabled:bg-surface-700 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								>
									<option value="">
										{newScopusArea ? 'Select a sub-area...' : 'First select an area'}
									</option>
									{#each availableScopusSubAreas as subArea}
										<option value={subArea.name}>{subArea.name}</option>
									{/each}
								</select>
							</div>
						</div>
						
						<button
							type="button"
							onclick={addScopusClassification}
							disabled={!newScopusArea || !newScopusSubArea}
							class="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-surface-300 dark:disabled:bg-surface-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
							</svg>
							Add Classification
						</button>
					</div>

					<p class="mt-3 text-xs text-surface-600 dark:text-surface-400">
						💡 Tip: You can add multiple classifications if your paper spans different subject areas.
					</p>
				</div>
			</section>

			<section>
				{#if page.url.pathname.includes('edit')}
					<!-- <PapersImages /> AKI MUDAR DEPOIS DA DEFESA -->
				{/if}
			</section>

			<div class="mt-4">
				<h5 class="text-lg font-semibold mb-1">Paper Images</h5>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
					Upload images, figures, or diagrams that support your paper (optional). These will be displayed alongside your paper.
				</p>
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
					<h5 class="text-lg font-semibold mb-1 mt-4">Upload Paper Document *</h5>
					<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
						Upload your paper in DOCX format. The document should contain the full text of your paper including all sections, references, and figures.
					</p>
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
					<div
						class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 paper-content"
					>
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
	
	<div class="flex justify-end gap-3 mt-6 pr-5">
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}>
			Save Draft
		</button>
		{#if page.url.pathname.includes('edit')}
			<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmit}>
				Submit Article
			</button>
		{/if}
	</div>
</main>
