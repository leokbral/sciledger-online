<script lang="ts">
	import { TagsInput, FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { User } from '$lib/types/User';
	import { writable } from 'svelte/store';
	import type { PaperPublishStoreData } from '$lib/types/PaperPublishStoreData';
	import { page } from '$app/state';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';
	import Autocomplete from '$lib/components/Autocomplete.svelte';

	import IconDropzone from '@lucide/svelte/icons/image-plus';
	import IconFile from '@lucide/svelte/icons/paperclip';
	import IconRemove from '@lucide/svelte/icons/circle-x';
	import { onMount, tick } from 'svelte';
	import OrcidProfile from '$lib/components/OrcidProfile/OrcidProfile.svelte';
	import { getSubAreasForArea, getAllAreaNames } from '$lib/constants/scopusAreas';
	import {
		MAIN_PAPER_FILE_LIMIT_LABEL,
		SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES,
		SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL,
		formatUploadBytes
	} from '$lib/constants/paperUploadLimits';
	import {
		getSupplementaryFilesTotal,
		normalizePaperCoverIds,
		validateMainPaperFileSize,
		validateSupplementaryFilesTotal
	} from '$lib/utils/paperFileValidation';
	import {
		authorSnapshotMatchesReference,
		extractOrcidAffiliations,
		formatAffiliationDisplayName,
		normalizeAffiliationSnapshot,
		normalizeAuthorSnapshot,
		validateCorrespondingAuthorSelection,
		collectReusableAffiliations,
		hasAffiliation,
		MAX_AFFILIATIONS_PER_AUTHOR,
		type PaperAuthorAffiliationSnapshot,
		type PaperAuthorSnapshot
	} from '$lib/utils/paperAuthorAffiliations';
	// Add these new variables
	let docxPreview = $state();
	let docxFile: File | null = $state(null);
	let mainDocumentUploadState = $state<
		| 'idle'
		| 'selected'
		| 'uploading'
		| 'converting'
		| 'extracting'
		| 'processing_images'
		| 'updating_preview'
		| 'success'
		| 'error'
	>('idle');
	let mainDocumentStatusMessage = $state('');
	let mainDocumentError = $state('');
	let mainDocumentWarning = $state('');
	let activeDocxProcessingToken = 0;

	// ORCID search variables
	let orcidId = $state('');
	let orcidProfile = $state(null);
	let isSearchingOrcid = $state(false);
	let orcidError = $state('');
	let isAddingOrcidUser = $state(false);
	let selectedOrcidProfile = $state(false);

	// Submission confirmation modal
	let showSubmitModal = $state(false);
	let confirmInformationAccurate = $state(false);
	let confirmPoliciesAgreed = $state(false);
	let isSavingPaper = $state(false);

	interface Props {
		authorsOptions: any;
		author: User;
		inicialValue?: PaperPublishStoreData;
		savePaper: (paper: PaperPublishStoreData) => void | Promise<void>;
		/** Affiliations this user already used on their other papers, offered for reuse. */
		knownAffiliations?: PaperAuthorAffiliationSnapshot[];
	}

	interface AuthorAffiliationForm extends PaperAuthorSnapshot {
		department: string;
		affiliation: string;
		affiliations: PaperAuthorAffiliationSnapshot[];
		isCorresponding: boolean;
	}

	let {
		authorsOptions = $bindable(),
		author,
		knownAffiliations = [],
		inicialValue = {
			title: '',
			authors: [],
			mainAuthor: null,
			abstract: '', //{ time: Date.now(), blocks: [] },
			coAuthors: [], //{ time: Date.now(), blocks: [] },
			authorAffiliations: [],
			id: '', // ID único gerado para o paper
			correspondingAuthor: author, // Autor correspondente como UUID
			reviewers: [], // Lista de revisores como UUIDs
			keywords: [],
			content: '',
			pdfUrl: '',
			paperPictures: [], // Alterado de articlePictures para paperPictures
						supplementaryMaterials: [],
						supplementaryFiles: [],
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
				responses: [],
				reviews: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: 'completed'
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

		// ========== Material Suplementar - Arquivos ========== //
		interface SupplementaryFileUpload {
			id?: string;
			file?: File;
			title: string;
			description?: string;
			previewUrl?: string;
			fileId?: string;
			filename?: string;
			fileSize?: number;
			mimeType?: string;
			isUploading?: boolean;
			uploadError?: string;
		}

		const MAX_TOTAL_SIZE = SUPPLEMENTARY_FILES_MAX_TOTAL_BYTES;

		let supplementaryFiles = $state<SupplementaryFileUpload[]>(
			inicialValue.supplementaryFiles ? [...inicialValue.supplementaryFiles] : []
		);

		let pendingSupplementaryFiles = $state<SupplementaryFileUpload[]>([]);
		let supplementaryUploadError = $state('');
		let isUploadingSupplementaryFiles = $state(false);

		// Calculate current total size of uploaded files
		const getCurrentUsedSize = () => {
			return getSupplementaryFilesTotal([...supplementaryFiles, ...pendingSupplementaryFiles]);
		};

		const getAvailableSpace = () => {
			return Math.max(0, MAX_TOTAL_SIZE - getCurrentUsedSize());
		};

		const getFormattedSize = (bytes: number) => {
			return formatUploadBytes(bytes);
		};

		function getTitleFromFilename(filename: string): string {
			const lastDotIndex = filename.lastIndexOf('.');
			if (lastDotIndex <= 0) return filename;
			return filename.substring(0, lastDotIndex);
		}

		function handleSupplementaryFileInputChange(event: Event) {
			const input = event.currentTarget as HTMLInputElement;
			const files = Array.from(input.files || []);
			if (files.length === 0) return;

			const validFiles: SupplementaryFileUpload[] = [];
			let oversizedCount = 0;
			let projectedTotalSize = getCurrentUsedSize();

			for (const file of files) {
				if (projectedTotalSize + file.size > MAX_TOTAL_SIZE) {
					oversizedCount += 1;
					continue;
				}

				projectedTotalSize += file.size;
				validFiles.push({
					id: crypto.randomUUID(),
					file,
					title: getTitleFromFilename(file.name),
					description: '',
					filename: file.name,
					fileSize: file.size,
					mimeType: file.type || 'application/octet-stream'
				});
			}

			if (validFiles.length > 0) {
				pendingSupplementaryFiles = [...pendingSupplementaryFiles, ...validFiles];
				supplementaryUploadError = '';
			}

			if (oversizedCount > 0) {
				supplementaryUploadError = `Os arquivos suplementares excedem o limite total de ${SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL}.`;
			}

			// Allow selecting the same file again if needed
			input.value = '';
		}

		function removePendingSupplementaryFile(index: number) {
			pendingSupplementaryFiles = pendingSupplementaryFiles.filter((_, i) => i !== index);
		}

		async function uploadPendingSupplementaryFiles() {
			if (pendingSupplementaryFiles.length === 0) {
				supplementaryUploadError = 'Please select at least one file.';
				return;
			}

			isUploadingSupplementaryFiles = true;
			supplementaryUploadError = '';
			const uploadedItems: SupplementaryFileUpload[] = [];

			try {
				const totalValidation = validateSupplementaryFilesTotal([
					...supplementaryFiles,
					...pendingSupplementaryFiles
				]);
				if (!totalValidation.ok) {
					throw new Error(totalValidation.message);
				}

				for (const pendingFile of pendingSupplementaryFiles) {
					if (!pendingFile.file) continue;

					const formData = new FormData();
					formData.append('file', pendingFile.file);
					formData.append('paperId', inicialValue.id || '');
					formData.append('uploadedBy', author?.id || '');

					const response = await fetch('/api/supplementary-materials/upload', {
						method: 'POST',
						body: formData
					});

					if (!response.ok) {
						let errorMessage = 'Upload failed';
						
						// Handle different error status codes
						if (response.status === 413) {
							errorMessage = `File or total size exceeds the ${SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL} limit`;
						}
						
						// Try to parse error response as JSON
						try {
							const errorData = await response.json();
							errorMessage = errorData.message || errorMessage;
						} catch {
							// If not JSON, use the status text or default message
							errorMessage = `${response.status}: ${response.statusText || errorMessage}`;
						}
						
						throw new Error(`${pendingFile.filename}: ${errorMessage}`);
					}

					const uploadedData = await response.json();

					uploadedItems.push({
						id: uploadedData.id || crypto.randomUUID(),
						fileId: uploadedData.fileId,
						filename: uploadedData.filename,
						fileSize: uploadedData.fileSize,
						mimeType: uploadedData.mimeType,
						title: pendingFile.title || getTitleFromFilename(uploadedData.filename),
						description: pendingFile.description
					});
				}

				supplementaryFiles = [...supplementaryFiles, ...uploadedItems];
				// @ts-ignore
				$store.supplementaryFiles = supplementaryFiles;
				pendingSupplementaryFiles = [];
			} catch (error) {
				supplementaryUploadError = (error as Error).message;
			} finally {
				isUploadingSupplementaryFiles = false;
			}
		}

		function removeSupplementaryFile(index: number) {
			supplementaryFiles = supplementaryFiles.filter((_, i) => i !== index);
			// @ts-ignore
			$store.supplementaryFiles = supplementaryFiles;
		}

	function getUsernameForAuthorValue(value: any): string {
		if (!value) return '';
		if (typeof value === 'object' && value.username) return String(value.username);

		const id = typeof value === 'string' ? value : value.id || value._id;
		const matchedAuthor = authorsOptions.find((option: User) => option.id === id || option._id === id);
		return matchedAuthor?.username || '';
	}

	function getInitialAuthorUsernames(): string[] {
		const authorsFromPaper =
			inicialValue.authors?.length > 0
				? inicialValue.authors
				: [inicialValue.mainAuthor, ...(inicialValue.coAuthors || [])].filter(Boolean);
		const usernames = authorsFromPaper
			.map((item) => getUsernameForAuthorValue(item))
			.filter(Boolean);

		if (usernames.length > 0) return [...new Set(usernames)];
		return author?.username ? [author.username] : [];
	}

	let inputAuthor = $state('');
	let inputAuthorList = $state(getInitialAuthorUsernames());
	let selected = $state({ value: '' });
	let content = $state(inicialValue.content || '');
	let authorAffiliations = $state<Record<string, AuthorAffiliationForm>>({});
	// let inputComponent: TagsInput = $state();

	function createAffiliationId() {
		return globalThis.crypto?.randomUUID?.() ?? `affiliation-${Date.now()}-${Math.random()}`;
	}

	function createEmptyAffiliation(): PaperAuthorAffiliationSnapshot {
		return {
			id: createAffiliationId(),
			organization: '',
			department: '',
			roleTitle: '',
			city: '',
			region: '',
			country: '',
			rorId: '',
			displayName: ''
		};
	}

	function normalizeAffiliationForm(
		affiliation: unknown,
		fallbackId?: string
	): PaperAuthorAffiliationSnapshot {
		return normalizeAffiliationSnapshot(affiliation, fallbackId) ?? {
			...createEmptyAffiliation(),
			id: fallbackId || createAffiliationId()
		};
	}

	function buildLegacyAffiliation(selectedAuthor?: User): PaperAuthorAffiliationSnapshot[] {
		const profileAffiliation = normalizeAffiliationSnapshot(
			{
				id: 'profile-affiliation',
				department: selectedAuthor?.position,
				organization: selectedAuthor?.institution,
				displayName: formatAffiliationDisplayName({
					department: selectedAuthor?.position,
					organization: selectedAuthor?.institution
				})
			},
			'profile-affiliation'
		);

		return profileAffiliation ? [profileAffiliation] : [];
	}

	function getAuthorOrcidAffiliations(selectedAuthor?: User): PaperAuthorAffiliationSnapshot[] {
		const authorRecord = selectedAuthor as User & { affiliations?: unknown[] };
		if (!Array.isArray(authorRecord?.affiliations)) return [];

		return authorRecord.affiliations
			.map((affiliation, index) => normalizeAffiliationSnapshot(affiliation, `orcid-affiliation-${index + 1}`))
			.filter((affiliation): affiliation is PaperAuthorAffiliationSnapshot => Boolean(affiliation));
	}

	function getAuthorReferenceByUsername(username: string): User | string | null {
		const selectedAuthor = getAuthorByUsername(username);
		return selectedAuthor || authorAffiliations[username]?.userId || null;
	}

	function normalizeAffiliationEntry(entry: AuthorAffiliationForm): AuthorAffiliationForm {
		const normalized = normalizeAuthorSnapshot(entry);
		const affiliations = (normalized?.affiliations ?? entry.affiliations ?? [])
			.map((affiliation, index) => normalizeAffiliationForm(affiliation, affiliation.id || `affiliation-${index + 1}`))
			.filter((affiliation) => {
				return Boolean(
					affiliation.organization ||
						affiliation.department ||
						affiliation.roleTitle ||
						affiliation.city ||
						affiliation.region ||
						affiliation.country ||
						affiliation.rorId ||
						affiliation.displayName
				);
			});
		const firstAffiliation = affiliations[0];

		return {
			...entry,
			name: (normalized?.name || entry.name || entry.username || '').trim(),
			email: normalized?.email || entry.email || '',
			orcid: normalized?.orcid || entry.orcid || '',
			department: firstAffiliation?.department || normalized?.department || '',
			affiliation: firstAffiliation?.organization || firstAffiliation?.displayName || normalized?.affiliation || '',
			affiliations,
			isCorresponding: Boolean(entry.isCorresponding)
		};
	}

	function syncAuthorAffiliationsForUsernames(usernames: string[]) {
		const nextAffiliations: Record<string, AuthorAffiliationForm> = {};

		for (const username of usernames) {
			const baseValues = getInitialAffiliationForUsername(username);
			const previousValues = authorAffiliations[username];
			const affiliations =
				previousValues?.affiliations?.length
					? previousValues.affiliations
					: baseValues.affiliations;
			nextAffiliations[username] = {
				...baseValues,
				...previousValues,
				username,
				name: (previousValues?.name || baseValues.name || username).trim(),
				department: previousValues?.department ?? baseValues.department,
				affiliation: previousValues?.affiliation ?? baseValues.affiliation,
				affiliations,
				isCorresponding:
					previousValues?.isCorresponding ??
					authorSnapshotMatchesReference(baseValues, $store.correspondingAuthor)
			};
		}

		const markedAuthors = Object.values(nextAffiliations).filter((entry) => entry.isCorresponding);
		const hasMatchingCorrespondingAuthor =
			$store.correspondingAuthor &&
			Object.values(nextAffiliations).some((entry) =>
				authorSnapshotMatchesReference(entry, $store.correspondingAuthor)
			);

		if ($store.correspondingAuthor && hasMatchingCorrespondingAuthor) {
			for (const username of Object.keys(nextAffiliations)) {
				nextAffiliations[username].isCorresponding = authorSnapshotMatchesReference(
					nextAffiliations[username],
					$store.correspondingAuthor
				);
			}
		} else if ($store.correspondingAuthor && !hasMatchingCorrespondingAuthor) {
			$store.correspondingAuthor = null;
		} else if (markedAuthors.length > 1) {
			for (const username of Object.keys(nextAffiliations)) {
				nextAffiliations[username].isCorresponding = false;
			}
		} else if (markedAuthors.length === 1) {
			$store.correspondingAuthor = getAuthorReferenceByUsername(markedAuthors[0].username || '');
		}

		authorAffiliations = nextAffiliations;
	}

	$effect(() => {
		if (author?.username && inputAuthorList.length === 0) {
			inputAuthorList = [author.username];
			syncAuthorAffiliationsForUsernames(inputAuthorList);
		}
	});

	function getAuthorByUsername(username: string): User | undefined {
		return authorsOptions.find((option: User) => option.username === username);
	}

	function getInitialAffiliationForUsername(username: string): AuthorAffiliationForm {
		const selectedAuthor = getAuthorByUsername(username);
		const existing = inicialValue.authorAffiliations?.find(
			(item) =>
				item.username === username ||
				(Boolean(item.userId) && Boolean(selectedAuthor?.id) && item.userId === selectedAuthor?.id)
		);
		const normalizedExisting = normalizeAuthorSnapshot(existing);

		const displayName = [selectedAuthor?.firstName, selectedAuthor?.lastName]
			.filter(Boolean)
			.join(' ')
			.trim();
		const authorAffiliationList =
			normalizedExisting?.affiliations?.length
				? normalizedExisting.affiliations
				: getAuthorOrcidAffiliations(selectedAuthor).length
					? getAuthorOrcidAffiliations(selectedAuthor)
					: buildLegacyAffiliation(selectedAuthor);
		const firstAffiliation = authorAffiliationList[0];

		return {
			userId: selectedAuthor?.id || normalizedExisting?.userId,
			username,
			name: normalizedExisting?.name || displayName || username,
			email: normalizedExisting?.email || selectedAuthor?.email || '',
			orcid: normalizedExisting?.orcid || selectedAuthor?.orcid || '',
			isCorresponding:
				normalizedExisting?.isCorresponding ||
				authorSnapshotMatchesReference(
					{
						userId: selectedAuthor?.id || normalizedExisting?.userId,
						username,
						name: normalizedExisting?.name || displayName || username
					},
					$store.correspondingAuthor
				),
			department: normalizedExisting?.department || firstAffiliation?.department || selectedAuthor?.position || '',
			affiliation:
				normalizedExisting?.affiliation ||
				firstAffiliation?.organization ||
				firstAffiliation?.displayName ||
				selectedAuthor?.institution ||
				'',
			affiliations: authorAffiliationList
		};
	}

	function serializeAuthorAffiliations(): AuthorAffiliationForm[] {
		const snapshots = inputAuthorList
			.map((username) => {
				const selectedAuthor = getAuthorByUsername(username);
				const values = authorAffiliations[username] || getInitialAffiliationForUsername(username);
				const normalizedValues = normalizeAffiliationEntry(values);
				const firstAffiliation = normalizedValues.affiliations[0];

				return {
					userId: selectedAuthor?.id || values.userId,
					username,
					name: normalizedValues.name.trim(),
					email: normalizedValues.email || selectedAuthor?.email || '',
					orcid: normalizedValues.orcid || selectedAuthor?.orcid || '',
					isCorresponding: normalizedValues.isCorresponding,
					department: (firstAffiliation?.department || normalizedValues.department || '').trim(),
					affiliation: (
						firstAffiliation?.organization ||
						firstAffiliation?.displayName ||
						normalizedValues.affiliation ||
						''
					).trim(),
					affiliations: normalizedValues.affiliations.map((affiliation, index) =>
						normalizeAffiliationForm(affiliation, affiliation.id || `affiliation-${index + 1}`)
					)
				};
			})
			.filter((item) => item.name.length > 0);

		return $store.correspondingAuthor
			? snapshots.map((snapshot) => ({
					...snapshot,
					isCorresponding: authorSnapshotMatchesReference(snapshot, $store.correspondingAuthor)
				}))
			: snapshots;
	}

	function setCorrespondingAuthor(username: string) {
		const reference = getAuthorReferenceByUsername(username);
		if (!reference) return;

		$store.correspondingAuthor = reference;
		authorAffiliations = Object.fromEntries(
			Object.entries(authorAffiliations).map(([key, values]) => [
				key,
				{
					...values,
					isCorresponding: key === username
				}
			])
		);
	}

	function clearCorrespondingAuthor() {
		$store.correspondingAuthor = null;
		authorAffiliations = Object.fromEntries(
			Object.entries(authorAffiliations).map(([key, values]) => [
				key,
				{
					...values,
					isCorresponding: false
				}
			])
		);
	}

	function affiliationsFor(username: string): PaperAuthorAffiliationSnapshot[] {
		return authorAffiliations[username]?.affiliations || [];
	}

	function affiliationLimitReached(username: string): boolean {
		return affiliationsFor(username).length >= MAX_AFFILIATIONS_PER_AUTHOR;
	}

	// Everything already known about the people on this paper, offered so the same
	// institution never has to be typed twice. Sources are the authors' own snapshots,
	// their earlier papers, their ORCID records and their profiles -- never a global
	// directory, and never another user's private data.
	let reusableAffiliations = $derived(
		collectReusableAffiliations([
			...Object.values(authorAffiliations).flatMap((entry) => entry.affiliations || []),
			...inputAuthorList.flatMap((username) => {
				const selectedAuthor = getAuthorByUsername(username);
				return [
					...getAuthorOrcidAffiliations(selectedAuthor),
					...buildLegacyAffiliation(selectedAuthor)
				];
			}),
			...knownAffiliations
		])
	);

	function addAffiliation(username: string) {
		const values = authorAffiliations[username] || getInitialAffiliationForUsername(username);
		// The server rejects a fourth as well; this only keeps the form honest.
		if ((values.affiliations || []).length >= MAX_AFFILIATIONS_PER_AUTHOR) return;
		authorAffiliations = {
			...authorAffiliations,
			[username]: {
				...values,
				affiliations: [...(values.affiliations || []), createEmptyAffiliation()]
			}
		};
	}

	function reuseAffiliation(username: string, affiliation: PaperAuthorAffiliationSnapshot) {
		const values = authorAffiliations[username] || getInitialAffiliationForUsername(username);
		const existing = values.affiliations || [];
		if (existing.length >= MAX_AFFILIATIONS_PER_AUTHOR) return;
		if (hasAffiliation(existing, affiliation)) return;
		authorAffiliations = {
			...authorAffiliations,
			[username]: {
				...values,
				// copied into this paper's snapshot; the source record is never mutated
				affiliations: [...existing, { ...affiliation, id: createAffiliationId() }]
			}
		};
	}

	function removeAffiliation(username: string, index: number) {
		const values = authorAffiliations[username] || getInitialAffiliationForUsername(username);
		authorAffiliations = {
			...authorAffiliations,
			[username]: {
				...values,
				affiliations: (values.affiliations || []).filter((_, currentIndex) => currentIndex !== index)
			}
		};
	}

	function validateCorrespondingAuthorForSubmission() {
		const validation = validateCorrespondingAuthorSelection(serializeAuthorAffiliations(), {
			requireOne: true
		});
		if (!validation.ok) {
			alert(validation.message);
			return false;
		}
		return true;
	}

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
		inputAuthor = e.inputValue;
		// inputSkillList = e.value
	};

	function onInvalidHandler(event: any): void {
		// toastStore.trigger({
		// 	message: `"${event.detail.input}" é um valor inválido. Por favor tente novamente!`,
		// 	background: 'preset-filled-error-500'
		// });
	}

	type ValidateArgs = {
		inputValue: string;
	};



	function isValidAuthor(value: ValidateArgs): boolean {
		return authorsOptions.some((option: User) => option.username === value.inputValue);
	}


	// async function uploadFile() {
	// 	if (!pdfFile) {
	// 		return { result: 'no_file' };
	// 	}

	// 	const formData = new FormData();
	// 	formData.append('file', pdfFile);

	// 	const response = await fetch('/api/pdfs/upload', {
	// 		method: 'POST',
	// 		body: formData
	// 	});

	// 	if (response.ok) {
	// 		const data = await response.json();
	// 		//location.reload(); descomente para atualizar a pagina depois de salvar
	// 		return data;
	// 	} else {
	// 		console.error('Erro ao fazer upload do arquivo:', response.statusText);
	// 	}

	// 	return;
	// }

	// Function to extract abstract from HTML content using regex
	function cleanHtmlText(input: string): string {
		return input
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\s+/g, ' ')
			.trim();
	}

	function isEffectivelyEmptyText(value: unknown): boolean {
		if (value === null || value === undefined) return true;
		const text = String(value)
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.trim();
		return text.length === 0;
	}

	function parseKeywordsText(text: string): string[] {
		const cleaned = text
			.replace(/^\s*(keywords?|palavras[-\s]?chave)\s*[:\-]?\s*/i, '')
			.trim();

		if (!cleaned) return [];

		const parts = cleaned
			.split(/[,;|\u2022\u00b7]/)
			.map((k) => k.trim().replace(/[\.;:]$/, ''))
			.filter((k) => k.length > 1 && k.length < 80);

		if (parts.length < 2) return [];

		const unique = [...new Set(parts.map((k) => k.toLowerCase()))];
		return unique.map((lower) => parts.find((p) => p.toLowerCase() === lower) || lower);
	}

	function normalizeToInlineHtml(html: string): string {
		if (!html) return '';
		if (typeof DOMParser === 'undefined') {
			const fallback = html
				.replace(/<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote)[^>]*>/gi, ' ')
				.replace(/<br\s*\/?\s*>/gi, ' ')
				.replace(/\s+/g, ' ')
				.replace(/>\s+</g, '><')
				.trim();

			return fallback ? `<p>${fallback}</p>` : '';
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
		const root = doc.body.firstElementChild;
		if (!root) return '';

		type ScriptPosition = 'normal' | 'sup' | 'sub';
		type Segment = { text: string; bold: boolean; italic: boolean; script: ScriptPosition };
		const segments: Segment[] = [];
		const blockTags = new Set([
			'p',
			'div',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'ul',
			'ol',
			'li',
			'blockquote',
			'table',
			'tr',
			'td',
			'th'
		]);

		const hasBoldStyle = (el: Element): boolean => {
			const style = (el.getAttribute('style') || '').toLowerCase();
			return /font-weight\s*:\s*(bold|[6-9]00)/.test(style);
		};

		const hasItalicStyle = (el: Element): boolean => {
			const style = (el.getAttribute('style') || '').toLowerCase();
			return /font-style\s*:\s*italic/.test(style);
		};

		const getScriptStyle = (el: Element): ScriptPosition | null => {
			const style = (el.getAttribute('style') || '').toLowerCase();
			if (/vertical-align\s*:\s*(super|text-top)/.test(style)) return 'sup';
			if (/vertical-align\s*:\s*(sub|text-bottom)/.test(style)) return 'sub';
			return null;
		};

		const walk = (node: Node, bold: boolean, italic: boolean, script: ScriptPosition) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = (node.textContent || '').replace(/\s+/g, ' ');
				if (!text) return;
				segments.push({ text, bold, italic, script });
				return;
			}

			if (node.nodeType !== Node.ELEMENT_NODE) return;

			const el = node as Element;
			const tag = el.tagName.toLowerCase();
			const nextBold = bold || tag === 'strong' || tag === 'b' || hasBoldStyle(el);
			const nextItalic = italic || tag === 'em' || tag === 'i' || hasItalicStyle(el);
			const nextScript =
				tag === 'sup' ? 'sup' : tag === 'sub' ? 'sub' : getScriptStyle(el) || script;

			if (tag === 'br') {
				segments.push({ text: ' ', bold: nextBold, italic: nextItalic, script: nextScript });
				return;
			}

			for (const child of Array.from(el.childNodes)) {
				walk(child, nextBold, nextItalic, nextScript);
			}

			if (blockTags.has(tag)) {
				segments.push({ text: ' ', bold: false, italic: false, script: 'normal' });
			}
		};

		for (const child of Array.from(root.childNodes)) {
			walk(child, false, false, 'normal');
		}

		const merged: Segment[] = [];
		for (const seg of segments) {
			if (!seg.text) continue;
			const last = merged[merged.length - 1];
			if (
				last &&
				last.bold === seg.bold &&
				last.italic === seg.italic &&
				last.script === seg.script
			) {
				last.text += seg.text;
			} else {
				merged.push({ ...seg });
			}
		}

		const escapeHtml = (text: string): string =>
			text
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');

		const rendered = merged
			.map((seg) => {
				const cleaned = seg.text.replace(/\s+/g, ' ');
				if (!cleaned.trim()) return cleaned;
				let value = escapeHtml(cleaned);
				if (seg.italic) value = `<em>${value}</em>`;
				if (seg.bold) value = `<strong>${value}</strong>`;
				if (seg.script === 'sup') value = `<sup>${value}</sup>`;
				if (seg.script === 'sub') value = `<sub>${value}</sub>`;
				return value;
			})
			.join('')
			.replace(/\s+/g, ' ')
			.replace(/\s*<\/em>\s*<em>\s*/g, ' ')
			.replace(/\s*<\/strong>\s*<strong>\s*/g, ' ')
			.replace(/\s*<\/sup>\s*<sup>\s*/g, '')
			.replace(/\s*<\/sub>\s*<sub>\s*/g, '')
			.replace(/([A-Za-zÀ-ÿ])\s*-\s*([A-Za-zÀ-ÿ])/g, '$1-$2')
			.trim();

		return rendered ? `<p>${rendered}</p>` : '';
	}

	function extractFirstSentenceSplitFromHtml(html: string): { title: string; abstract: string } {
		if (!html || typeof DOMParser === 'undefined') return { title: '', abstract: '' };

		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const blockedLabels = /^(abstract|resumo|keywords?|palavras[-\s]?chave|introduction|introdu[cç][aã]o|main)\s*:?$/i;

		const candidates = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,span'))
			.map((el) => {
				const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
				return {
					element: el,
					text,
					html: (el.innerHTML || '').trim()
				};
			})
			.map((item) => ({
				...item,
				text: item.text.replace(/^\s*(title|t[ií]tulo)\s*[:\-]\s*/i, '').trim(),
				html: item.html.replace(/^\s*(?:<[^>]+>\s*)*(title|t[ií]tulo)\s*[:\-]\s*/i, '').trim()
			}))
			.filter((item) => item.text.length > 0)
			.filter((item) => !blockedLabels.test(item.text));

		if (candidates.length === 0) return { title: '', abstract: '' };

		const first = candidates[0];
		const walker = doc.createTreeWalker(first.element, NodeFilter.SHOW_TEXT);
		const segments: Array<{ node: Text; start: number; end: number; text: string }> = [];
		let totalLength = 0;
		let current: Node | null;

		while ((current = walker.nextNode())) {
			const node = current as Text;
			const text = node.data;
			if (!text) continue;
			segments.push({ node, start: totalLength, end: totalLength + text.length, text });
			totalLength += text.length;
		}

		if (segments.length === 0) return { title: '', abstract: '' };

		const fullText = segments.map((s) => s.text).join('');
		const sentenceBoundary = fullText.search(/[.!?](?=\s|$)/);

		const locate = (index: number) => {
			const clamped = Math.max(0, Math.min(index, totalLength));
			for (const segment of segments) {
				if (clamped <= segment.end) {
					return { node: segment.node, offset: Math.max(0, clamped - segment.start) };
				}
			}
			const last = segments[segments.length - 1];
			return { node: last.node, offset: last.text.length };
		};

		let title = '';
		let abstract = '';

		if (sentenceBoundary >= 0) {
			const titleEnd = sentenceBoundary + 1;
			const afterBoundary = fullText.slice(titleEnd);
			const leadingSpaces = (afterBoundary.match(/^\s+/)?.[0].length || 0);
			const abstractStart = titleEnd + leadingSpaces;

			const titleStartLoc = locate(0);
			const titleEndLoc = locate(titleEnd);
			const abstractStartLoc = locate(abstractStart);
			const abstractEndLoc = locate(totalLength);

			const titleRange = doc.createRange();
			titleRange.setStart(titleStartLoc.node, titleStartLoc.offset);
			titleRange.setEnd(titleEndLoc.node, titleEndLoc.offset);
			const titleContainer = doc.createElement('div');
			titleContainer.appendChild(titleRange.cloneContents());
			title = normalizeToInlineHtml(titleContainer.innerHTML);

			if (abstractStart < totalLength) {
				const abstractRange = doc.createRange();
				abstractRange.setStart(abstractStartLoc.node, abstractStartLoc.offset);
				abstractRange.setEnd(abstractEndLoc.node, abstractEndLoc.offset);
				const abstractContainer = doc.createElement('div');
				abstractContainer.appendChild(abstractRange.cloneContents());
				abstract = normalizeToInlineHtml(abstractContainer.innerHTML);
			}
		} else {
			title = normalizeToInlineHtml(first.html);
		}

		const titleText = cleanHtmlText(title);
		if (titleText.length > 240) {
			title = titleText.slice(0, 240).trim();
		}

		if (!abstract) {
			const fallbackAbstract = candidates
				.slice(1)
				.find(
					(item) =>
						item.text.length > 20 &&
						!/^(keywords?|palavras[-\s]?chave)\s*:?/i.test(item.text) &&
						item.text.toLowerCase() !== titleText.toLowerCase()
				);

			if (fallbackAbstract) {
				abstract = normalizeToInlineHtml(fallbackAbstract.html);
			}
		}

		return {
			title: title.trim(),
			abstract: abstract.trim()
		};
	}

	function extractTitleFromHtml(html: string): string {
		if (!html) return '';

		const titleHeadingRegex = /<h[1-6][^>]*>\s*(?:Title|TITLE|title|T[ií]tulo|T[IÍ]TULO)\s*<\/h[1-6]>/i;
		const abstractHeadingRegex =
			/<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;
		const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;

		const titleHeadingMatch = titleHeadingRegex.exec(html);
		const abstractHeadingMatch = abstractHeadingRegex.exec(html);

		const labeledTitleMatch = html.match(
			/<(?:h[1-6]|p|div|span)[^>]*>\s*(?:Title|T[ií]tulo)\s*[:\-]\s*([\s\S]*?)<\/(?:h[1-6]|p|div|span)>/i
		);
		if (labeledTitleMatch) {
			const labeledTitle = cleanHtmlText(labeledTitleMatch[1]);
			if (labeledTitle.length >= 3) {
				return labeledTitle;
			}
		}

		if (titleHeadingMatch) {
			const startIndex = titleHeadingMatch.index + titleHeadingMatch[0].length;
			const endIndex = abstractHeadingMatch ? abstractHeadingMatch.index : html.length;
			const betweenTitleAndAbstract = html.substring(startIndex, endIndex);

			let match: RegExpExecArray | null;
			while ((match = paragraphRegex.exec(betweenTitleAndAbstract)) !== null) {
				const paragraphText = cleanHtmlText(match[1]);
				if (paragraphText.length > 0) {
					return paragraphText;
				}
			}
		}

		const allHeadings = [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
		const abstractIndex = abstractHeadingMatch ? abstractHeadingMatch.index : html.length;
		const disallowedHeadings = new Set([
			'abstract',
			'resumo',
			'keywords',
			'palavras-chave',
			'introduction',
			'introducao',
			'introdução',
			'main'
		]);

		for (const heading of allHeadings) {
			const headingIndex = heading.index ?? 0;
			if (headingIndex >= abstractIndex) continue;

			const text = cleanHtmlText(heading[1]);
			const normalized = text.toLowerCase();
			if (text.length < 3 || disallowedHeadings.has(normalized)) continue;
			return text;
		}

		if (abstractHeadingMatch) {
			const beforeAbstract = html.substring(0, abstractHeadingMatch.index);
			const blocks = [
				...beforeAbstract.matchAll(/<(?:h[1-6]|p)[^>]*>([\s\S]*?)<\/(?:h[1-6]|p)>/gi)
			]
				.map((m) => cleanHtmlText(m[1]))
				.filter((t) => t.length >= 3 && t.length <= 240)
				.filter((t) => !/@/.test(t));

			if (blocks.length > 0) {
				const best = blocks.reduce((acc, cur) => (cur.length > acc.length ? cur : acc));
				return best;
			}
		}

		const firstParagraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
			.map((m) => cleanHtmlText(m[1]))
			.filter((t) => t.length >= 3 && t.length <= 240)
			.filter(
				(t) =>
					!/^(abstract|resumo|keywords?|palavras[-\s]?chave|introduction|introdu[cç][aã]o)$/i.test(
						t
					)
			);

		if (firstParagraphs.length > 0) {
			return firstParagraphs[0];
		}

		const genericBlocks = [...html.matchAll(/<(?:h[1-6]|p|div|span)[^>]*>([\s\S]*?)<\/(?:h[1-6]|p|div|span)>/gi)]
			.map((m) => cleanHtmlText(m[1]))
			.filter((t) => t.length >= 3 && t.length <= 240)
			.filter((t) => !/@/.test(t))
			.filter(
				(t) =>
					!/^(abstract|resumo|keywords?|palavras[-\s]?chave|introduction|introdu[cç][aã]o|main)$/i.test(
						t
					)
			);

		if (genericBlocks.length > 0) {
			return genericBlocks[0];
		}

		const plainText = cleanHtmlText(html);
		const candidateFromPlain = plainText
			.split(/(?<=[\.\?!])\s+|\n+/)
			.map((t) => t.trim())
			.find(
				(t) =>
					t.length >= 3 &&
					t.length <= 220 &&
					!/^(abstract|resumo|keywords?|palavras[-\s]?chave|introduction|introdu[cç][aã]o|main)$/i.test(
						t
					)
			);

		if (candidateFromPlain) {
			return candidateFromPlain;
		}
		return '';
	}

	function extractAbstractFromHtml(html: string): string {
		if (!html) return '';

		// First try: use only the first paragraph after "Abstract/Resumo" heading.
		const abstractHeadingRegex = /<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;
		const abstractHeadingMatch = abstractHeadingRegex.exec(html);

		if (abstractHeadingMatch) {
			const startIndex = abstractHeadingMatch.index + abstractHeadingMatch[0].length;
			const afterHeading = html.substring(startIndex);
			const nextHeadingMatch = /<h[1-6][^>]*>/i.exec(afterHeading);
			const sectionUntilNextHeading = nextHeadingMatch
				? afterHeading.substring(0, nextHeadingMatch.index)
				: afterHeading;

			const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
			let paragraphMatch: RegExpExecArray | null;
			while ((paragraphMatch = paragraphRegex.exec(sectionUntilNextHeading)) !== null) {
				const text = cleanHtmlText(paragraphMatch[1]);
				if (text.length > 20) {
					return normalizeToInlineHtml(paragraphMatch[1]);
				}
			}
		}

		// Fallback: use only the first valid paragraph after the detected title paragraph.
		const extractedTitle = extractTitleFromHtml(html).trim().toLowerCase();
		const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
		const paragraphs = [...html.matchAll(paragraphRegex)].map((m) => ({
			html: m[1],
			text: cleanHtmlText(m[1])
		}));

		const titleParagraphIndex = extractedTitle
			? paragraphs.findIndex((p) => p.text.trim().toLowerCase() === extractedTitle)
			: -1;

		const startIndex = titleParagraphIndex >= 0 ? titleParagraphIndex + 1 : 0;

		for (let i = startIndex; i < paragraphs.length; i++) {
			const text = paragraphs[i].text.trim();
			const normalized = text.toLowerCase();

			if (text.length <= 20) continue;
			if (normalized === extractedTitle) continue;
			if (/^(abstract|resumo|keywords?|palavras[-\s]?chave)\s*:?$/i.test(text)) continue;
			return normalizeToInlineHtml(paragraphs[i].html);
		}
		return '';
	}

	function extractKeywordsFromHtml(html: string): string[] {
		if (!html) return [];

		const genericTextBlocks = [...html.matchAll(/<(?:p|div|li|span)[^>]*>([\s\S]*?)<\/(?:p|div|li|span)>/gi)]
			.map((m) => cleanHtmlText(m[1]))
			.filter((t) => t.length > 0);

		for (const block of genericTextBlocks) {
			if (/(^|\b)(keywords?|palavras[-\s]?chave)\b/i.test(block)) {
				const parsed = parseKeywordsText(block);
				if (parsed.length > 0) {
					return parsed;
				}
			}
		}

		const abstractHeadingRegex =
			/<h[1-6][^>]*>\s*(?:Abstract|ABSTRACT|abstract|Resumo|RESUMO|resumo)\s*<\/h[1-6]>/i;
		const mainHeadingRegex = /<h[1-6][^>]*>\s*(?:Main|MAIN|main)\s*<\/h[1-6]>/i;
		const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;

		const abstractMatch = abstractHeadingRegex.exec(html);
		if (!abstractMatch) {
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
			const text = cleanHtmlText(match[1]);
			if (text.length > 0) paragraphs.push(text);
		}

		if (paragraphs.length < 1) {
		} else {
			for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
				const parsed = parseKeywordsText(paragraphs[i]);
				if (parsed.length > 0) {
					return parsed;
				}
			}
		}

		let keywordsParagraph = paragraphs[1] || paragraphs[0] || '';

		if (!keywordsParagraph.includes(',') && paragraphs.length > 2) {
			const withCommas = paragraphs.slice(1).find((p) => p.includes(','));
			if (withCommas) keywordsParagraph = withCommas;
		}

		keywordsParagraph = keywordsParagraph
			.replace(/^\s*(keywords?|palavras-chave)\s*[:\-]?\s*/i, '')
			.trim();

		const keywords = parseKeywordsText(keywordsParagraph);

		const uniqueKeywords = [...new Set(keywords)];
		return uniqueKeywords;
	}

	function isMainDocumentBusy() {
		return (
			mainDocumentUploadState === 'uploading' ||
			mainDocumentUploadState === 'converting' ||
			mainDocumentUploadState === 'extracting' ||
			mainDocumentUploadState === 'processing_images' ||
			mainDocumentUploadState === 'updating_preview'
		);
	}

	function resetExtractedDocumentMetadata() {
		$store.title = '';
		$store.abstract = '';
		$store.keywords = [];
		content = '';
		$store.content = '';
		mainDocumentWarning = '';
	}

	async function convertDocument(file: File, token: number) {
		if (!file) {
			console.error('No file provided');
			return;
		}

		const formData = new FormData();
		formData.append('file', file);

		try {
			mainDocumentUploadState = 'converting';
			mainDocumentStatusMessage = 'Converting document...';
			mainDocumentWarning = '';
			await tick();

			const response = await fetch('/api/dth/convert', {
				method: 'POST',
				body: formData,
				headers: {
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message ||
						errorData.error ||
						'Unable to process the document. Please try again.'
				);
			}

			const data = await response.json();
			const convertedHtml = data.html || data.result || '';
			if (token !== activeDocxProcessingToken || docxFile !== file) {
				return;
			}

			mainDocumentUploadState = 'processing_images';
			mainDocumentStatusMessage = 'Processing images...';
			mainDocumentWarning = data.imageProcessingWarning || '';
			await tick();

			mainDocumentUploadState = 'extracting';
			mainDocumentStatusMessage = 'Extracting content...';
			content = convertedHtml;
			$store.content = convertedHtml;

			// Automatically extract and fill abstract
			if (convertedHtml) {
				const firstSentenceSplit = extractFirstSentenceSplitFromHtml(convertedHtml);
				const extractedTitle = firstSentenceSplit.title || extractTitleFromHtml(convertedHtml);
				const extractedAbstract =
					firstSentenceSplit.abstract || extractAbstractFromHtml(convertedHtml);
				const extractedKeywords = extractKeywordsFromHtml(convertedHtml);

				$store.title = extractedTitle || '';
				$store.abstract = extractedAbstract || '';
				$store.keywords = extractedKeywords;
			}

			mainDocumentUploadState = 'updating_preview';
			mainDocumentStatusMessage = 'Updating preview...';
			await tick();

			if (token === activeDocxProcessingToken) {
				mainDocumentUploadState = 'success';
				mainDocumentStatusMessage = 'Document processed successfully.';
				mainDocumentError = '';
			}
		} catch (error) {
			console.error('Error:', error);
			if (token === activeDocxProcessingToken) {
				mainDocumentUploadState = 'error';
				mainDocumentStatusMessage = '';
				mainDocumentError =
					error instanceof Error
						? error.message
						: 'Unable to process the document. Please try again.';
			}
			throw error;
		}
	}

	async function hdlSaveDraft(
		event?: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		if (isSavingPaper) return;

		isSavingPaper = true;
		try {
			const selectedAuthors = inputAuthorList
				.map((username) => getAuthorByUsername(username))
				.filter((item): item is User => Boolean(item));
			const serializedAuthorAffiliations = serializeAuthorAffiliations();
			const markedCorrespondingAuthor = serializedAuthorAffiliations.find(
				(item) => item.isCorresponding
			);

			$store.authors = selectedAuthors;
			$store.mainAuthor = $store.authors[0];
			$store.coAuthors = $store.authors.slice(1, $store.authors.length);
			$store.authorAffiliations = serializedAuthorAffiliations;
			$store.correspondingAuthor = markedCorrespondingAuthor
				? getAuthorByUsername(markedCorrespondingAuthor.username || '') ||
					markedCorrespondingAuthor.userId ||
					null
				: null;
			//const uploadResult = await uploadFile();
			// if (
			// 	!$store.pdfUrl ||
			// 	(uploadResult.result !== $store.pdfUrl && uploadResult.result !== 'no_file')
			// ) {
			// 	$store.pdfUrl = uploadResult.result;
			// }
			$store.pdfUrl = 'nope';
			let coverImageIds = normalizePaperCoverIds(imageItems.filter((item) => item.id).map((item) => item.id));
			const newCoverImage = imageItems.find((item) => item.file);
			if (newCoverImage?.file) {
				const formData = new FormData();
				formData.append('image', newCoverImage.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				if (!response.ok || !data.id) {
					throw new Error(data.message || 'Failed to upload paper cover image.');
				}
				coverImageIds = normalizePaperCoverIds([data.id]);
				imageItems = coverImageIds.map((id) => ({
					id,
					previewUrl: `/api/images/${id}`
				}));
			}

			$store.paperPictures = coverImageIds;
			$store.content = content;
			await savePaper($store);

			return $store;
		} finally {
			isSavingPaper = false;
		}
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (isSavingPaper) return;

		// Show confirmation modal instead of directly submitting
		showSubmitModal = true;
	}

	async function confirmSubmit() {
		if (isSavingPaper) return;

		if (!confirmInformationAccurate) {
			alert('Please confirm that the information submitted is accurate.');
			return;
		}

		if (!confirmPoliciesAgreed) {
			alert('Please confirm that you have read and agree to the platform policies.');
			return;
		}

		if (!validateCorrespondingAuthorForSubmission()) {
			return;
		}

		$store.status = 'reviewer assignment';

		showSubmitModal = false;
		confirmInformationAccurate = false;
		confirmPoliciesAgreed = false;
		await hdlSaveDraft();
	}

	function cancelSubmit() {
		showSubmitModal = false;
		confirmInformationAccurate = false;
		confirmPoliciesAgreed = false;
	}

	// function save() {
	// 	// dispatch('savePaper', { store: $store });
	// }


	function generateDocxPreview(event: any) {
		if (isMainDocumentBusy()) {
			return;
		}

		if (event.acceptedFiles.length === 0) {
			docxPreview = null;
			docxFile = null;
			return;
		}

		const _file = event.acceptedFiles[0];
		const sizeValidation = validateMainPaperFileSize(_file);
		if (!sizeValidation.ok) {
			activeDocxProcessingToken++;
			docxPreview = null;
			docxFile = null;
			mainDocumentUploadState = 'error';
			mainDocumentStatusMessage = '';
			mainDocumentError = sizeValidation.message;
			mainDocumentWarning = '';
			return;
		}

		const token = ++activeDocxProcessingToken;
		docxFile = _file;
		mainDocumentUploadState = 'selected';
		mainDocumentStatusMessage = 'Document selected. Preparing upload...';
		mainDocumentError = '';
		mainDocumentWarning = '';
		resetExtractedDocumentMetadata();

		const reader = new FileReader();
		reader.onload = (event) => {
			if (token === activeDocxProcessingToken) {
				docxPreview = event.target?.result;
				mainDocumentUploadState = 'uploading';
				mainDocumentStatusMessage = 'Uploading document...';
			}
		};
		reader.onerror = () => {
			if (token === activeDocxProcessingToken) {
				mainDocumentUploadState = 'error';
				mainDocumentStatusMessage = '';
				mainDocumentError = 'Unable to read the selected document. Please try again.';
				mainDocumentWarning = '';
			}
		};
		reader.readAsDataURL(_file);
		convertDocument(_file, token).catch(() => {
			// convertDocument already set the user-facing error state.
		});
	}

	interface ImageItem {
		id?: string;
		file?: File;
		previewUrl: string;
	}

	let imageItems: ImageItem[] = $state(
		normalizePaperCoverIds(inicialValue.paperPictures).map((id) => ({
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
			imageItems = [{ file, previewUrl: e.target?.result as string }];
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
		const profileAffiliations = extractOrcidAffiliations(profile);

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
					const existingUser = {
						...errorData.user,
						affiliations: errorData.user?.affiliations?.length
							? errorData.user.affiliations
							: profileAffiliations
					};
					authorsOptions = [...authorsOptions, { ...existingUser, label: existingUser.username }];
					inputAuthorList = [...inputAuthorList, existingUser.username];
					syncAuthorAffiliationsForUsernames(inputAuthorList);
					clearOrcidSearch();
					alert(
						`${existingUser.firstName} ${existingUser.lastName} added as co-author (existing user)!`
					);
					return;
				}
				throw new Error(errorData.error || 'Failed to add ORCID user');
			}

			const data = await response.json();
			const newUser = {
				...data.user,
				affiliations: data.user?.affiliations?.length ? data.user.affiliations : profileAffiliations
			};

			// Adicionar o novo usuário às opções de autores
			authorsOptions = [...authorsOptions, { ...newUser, label: newUser.username }];

			// Adicionar o usuário à lista de autores
			inputAuthorList = [...inputAuthorList, newUser.username];
			syncAuthorAffiliationsForUsernames(inputAuthorList);

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
							loginUrl: `${window.location.origin}/recovery`
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

	onMount(() => {
		syncAuthorAffiliationsForUsernames(inputAuthorList);
	});
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

			<div class="mb-6 w-full bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 rounded-lg p-4">
				<h5 class="text-lg font-semibold mb-1">Upload Paper Document *</h5>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
					Upload your paper in DOCX format first. Title, abstract, and keywords will be auto-filled when available. Maximum size: {MAIN_PAPER_FILE_LIMIT_LABEL}.
				</p>
				<div class:pointer-events-none={isMainDocumentBusy()} class:opacity-60={isMainDocumentBusy()}>
					<FileUpload
						name="docx-files"
						accept=".docx,.doc"
						maxFiles={1}
						subtext="Attach only 1 DOCX file."
						onFileChange={generateDocxPreview}
						onFileReject={() => {
							mainDocumentUploadState = 'error';
							mainDocumentStatusMessage = '';
							mainDocumentError = 'Please select a valid DOCX file.';
							mainDocumentWarning = '';
						}}
						classes="w-full"
						allowDrop
					>
						{#snippet iconInterface()}<IconDropzone class="size-8" />{/snippet}
						{#snippet iconFile()}<IconFile class="size-4" />{/snippet}
						{#snippet iconFileRemove()}<IconRemove class="size-4" />{/snippet}
					</FileUpload>
				</div>
				{#if mainDocumentStatusMessage}
					<div class="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-800">
						{mainDocumentStatusMessage}
					</div>
				{/if}
				{#if mainDocumentUploadState === 'success' && docxFile}
					<div class="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
						{docxFile.name} processed. Metadata and preview were updated from this document.
					</div>
				{/if}
				{#if mainDocumentWarning}
					<div class="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
						{mainDocumentWarning}
					</div>
				{/if}
				{#if mainDocumentError}
					<div class="mt-3 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">
						{mainDocumentError}
					</div>
				{/if}
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
				<p class="block mb-1 font-semibold">Authors *</p>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-2">
					Add all authors of this paper. Type the username and select from the dropdown, or use the ORCID search below to find and add co-authors.
				</p>
				<TagsInput
					base="grid !h-auto "
					value={inputAuthorList}
					{onInputValueChange}
					onValueChange={(e) => {
						inputAuthorList = e.value;
						syncAuthorAffiliationsForUsernames(inputAuthorList);
					}}
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
							selected = option.username;

							inputAuthorList = [...inputAuthorList, option.username];
							syncAuthorAffiliationsForUsernames(inputAuthorList);
						}}
					/>
				</div>
			</section>

			<section class="mb-4 w-full">
				<div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border">
					<h3 class="text-lg font-semibold mb-2 text-surface-900 dark:text-surface-100">
						Author Details
					</h3>
					<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
						Define how each author should appear in the paper, including the corresponding author and paper-specific affiliations.
					</p>

					{#if inputAuthorList.length === 0}
						<p class="text-sm text-surface-500">Add at least one author to fill affiliation details.</p>
					{:else}
						<div class="space-y-4">
							{#each inputAuthorList as username (username)}
								{#if authorAffiliations[username]}
									<div class="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 p-3">
										<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div>
												<p class="text-sm font-semibold text-surface-800 dark:text-surface-100">
													{authorAffiliations[username].name || username}
													<span class="text-surface-500 font-normal"> (@{username})</span>
												</p>
												{#if authorAffiliations[username].orcid}
													<a
														href={`https://orcid.org/${authorAffiliations[username].orcid}`}
														target="_blank"
														rel="noopener"
														class="mt-1 inline-flex text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
													>
														ORCID {authorAffiliations[username].orcid}
													</a>
												{/if}
											</div>
											<div class="flex flex-wrap items-center gap-2">
												<label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface-300 px-3 py-2 text-xs font-medium text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:text-surface-200 dark:hover:bg-surface-800">
													<input
														type="radio"
														name="corresponding-author"
														checked={authorAffiliations[username].isCorresponding}
														onchange={() => setCorrespondingAuthor(username)}
														class="h-4 w-4 text-primary-500"
													/>
													Corresponding Author
												</label>
												{#if authorAffiliations[username].isCorresponding}
													<button
														type="button"
														onclick={clearCorrespondingAuthor}
														class="rounded-lg border border-surface-300 px-3 py-2 text-xs font-medium text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
													>
														Clear
													</button>
												{/if}
											</div>
										</div>

										<div class="grid grid-cols-1 gap-3">
											<div>
												<label for={`author-display-name-${username}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
													Display name
												</label>
												<input
													id={`author-display-name-${username}`}
													type="text"
													bind:value={authorAffiliations[username].name}
													placeholder="Full author name"
													class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-800"
												/>
											</div>
										</div>

										<div class="mt-4">
											<div class="mb-2 flex items-center justify-between gap-3">
												<p class="text-xs font-semibold uppercase text-surface-500">
													Affiliations ({affiliationsFor(username).length}/{MAX_AFFILIATIONS_PER_AUTHOR})
												</p>
												<button
													type="button"
													onclick={() => addAffiliation(username)}
													disabled={affiliationLimitReached(username)}
													title={affiliationLimitReached(username)
														? `An author can have at most ${MAX_AFFILIATIONS_PER_AUTHOR} affiliations.`
														: 'Add a blank affiliation'}
													class="rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-surface-200 disabled:text-surface-400 disabled:hover:bg-transparent dark:border-primary-700 dark:text-primary-200 dark:hover:bg-primary-900/30"
												>
													+ Add affiliation
												</button>
											</div>

											{#if affiliationLimitReached(username)}
												<p class="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
													Limit reached: an author can have at most {MAX_AFFILIATIONS_PER_AUTHOR} affiliations.
													Remove one to add another.
												</p>
											{:else if reusableAffiliations.length > 0}
												<div class="mb-2 rounded-lg border border-surface-200 bg-surface-50 p-2 dark:border-surface-700 dark:bg-surface-800">
													<p class="mb-1.5 text-xs text-surface-600 dark:text-surface-400">
														Reuse an affiliation already on file:
													</p>
													<div class="flex flex-wrap gap-1.5">
														{#each reusableAffiliations as reusable (reusable.key)}
															<button
																type="button"
																onclick={() => reuseAffiliation(username, reusable.affiliation)}
																disabled={hasAffiliation(affiliationsFor(username), reusable.affiliation)}
																title={hasAffiliation(affiliationsFor(username), reusable.affiliation)
																	? 'Already added for this author'
																	: 'Add this affiliation to the author'}
																class="rounded-full border border-surface-300 bg-white px-2.5 py-1 text-xs text-surface-700 hover:border-primary-400 hover:text-primary-700 disabled:cursor-not-allowed disabled:border-surface-200 disabled:bg-surface-100 disabled:text-surface-400 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-200"
															>
																+ {reusable.displayName}
															</button>
														{/each}
													</div>
												</div>
											{/if}

											{#if authorAffiliations[username].affiliations.length === 0}
												<p class="rounded-lg border border-dashed border-surface-300 p-3 text-sm text-surface-500 dark:border-surface-600">
													No affiliations added for this paper.
												</p>
											{:else}
												<div class="space-y-3">
													{#each authorAffiliations[username].affiliations as affiliation, affiliationIndex (affiliation.id || affiliationIndex)}
														<div class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800">
															<div class="mb-3 flex items-center justify-between gap-3">
																<p class="text-xs font-semibold text-surface-600 dark:text-surface-300">
																	Affiliation {affiliationIndex + 1}
																</p>
																<button
																	type="button"
																	onclick={() => removeAffiliation(username, affiliationIndex)}
																	class="rounded p-1 text-surface-500 hover:bg-surface-200 hover:text-error-600 dark:hover:bg-surface-700"
																	aria-label={`Remove affiliation ${affiliationIndex + 1}`}
																>
																	<IconRemove size={16} />
																</button>
															</div>
															<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
																<div>
																	<label for={`author-affiliation-organization-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																		Organization / Institution
																	</label>
																	<input
																		id={`author-affiliation-organization-${username}-${affiliationIndex}`}
																		type="text"
																		bind:value={affiliation.organization}
																		placeholder="Federal University"
																		class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																	/>
																</div>
																<div>
																	<label for={`author-affiliation-department-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																		Department
																	</label>
																	<input
																		id={`author-affiliation-department-${username}-${affiliationIndex}`}
																		type="text"
																		bind:value={affiliation.department}
																		placeholder="Computer Science Department"
																		class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																	/>
																</div>
																<div>
																	<label for={`author-affiliation-role-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																		Role / title
																	</label>
																	<input
																		id={`author-affiliation-role-${username}-${affiliationIndex}`}
																		type="text"
																		bind:value={affiliation.roleTitle}
																		placeholder="Researcher"
																		class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																	/>
																</div>
																<div>
																	<label for={`author-affiliation-ror-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																		ROR ID
																	</label>
																	<input
																		id={`author-affiliation-ror-${username}-${affiliationIndex}`}
																		type="text"
																		bind:value={affiliation.rorId}
																		placeholder="https://ror.org/..."
																		class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																	/>
																</div>
																<div>
																	<label for={`author-affiliation-city-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																		City
																	</label>
																	<input
																		id={`author-affiliation-city-${username}-${affiliationIndex}`}
																		type="text"
																		bind:value={affiliation.city}
																		placeholder="Natal"
																		class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																	/>
																</div>
																<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
																	<div>
																		<label for={`author-affiliation-region-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																			Region
																		</label>
																		<input
																			id={`author-affiliation-region-${username}-${affiliationIndex}`}
																			type="text"
																			bind:value={affiliation.region}
																			placeholder="RN"
																			class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																		/>
																	</div>
																	<div>
																		<label for={`author-affiliation-country-${username}-${affiliationIndex}`} class="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
																			Country
																		</label>
																		<input
																			id={`author-affiliation-country-${username}-${affiliationIndex}`}
																			type="text"
																			bind:value={affiliation.country}
																			placeholder="Brazil"
																			class="w-full p-2 border border-surface-300 dark:border-surface-600 rounded-lg text-sm bg-white dark:bg-surface-900"
																		/>
																	</div>
																</div>
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
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
				<p class="block mb-1 font-semibold">Keywords *</p>
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
							<div class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
								Added Classifications:
							</div>
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
											aria-label="Remove classification"
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
						<div class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
							Add New Classification:
						</div>
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

			<!-- Supplementary Files Section -->
			<section class="w-full bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm border border-surface-200/80 dark:border-surface-700 rounded-2xl p-5 mb-6 shadow-[0_10px_35px_-20px_rgba(0,0,0,0.45)]">
				<div class="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
					<h3 class="text-xl font-semibold text-surface-900 dark:text-surface-100 tracking-tight">
						Supplementary Files (max {SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL} total)
					</h3>
					<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
						Upload direct supplementary files up to {SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL} combined.
					</p>
				</div>

				{#if supplementaryFiles.length > 0}
					<div class="mb-5 space-y-2">
						<div class="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
							Uploaded Files ({supplementaryFiles.length}):
						</div>
						<div class="space-y-3">
							{#each supplementaryFiles as file, index}
								<div class="bg-gradient-to-r from-surface-50 to-white dark:from-surface-800 dark:to-surface-800/80 border border-surface-200 dark:border-surface-700 rounded-xl p-4 group hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200">
									<div class="flex justify-between items-start mb-2">
										<div class="flex-1">
											<div class="flex items-center gap-2 mb-1">
												<div class="w-6 h-6 rounded-md border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 flex items-center justify-center">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path d="M8 16.5a1 1 0 11-2 0 1 1 0 012 0zM15 7a2 2 0 11-4 0 2 2 0 014 0zM16.824 15.80a2 2 0 00-1.02-1.496c.726-.447 1.596-.481 2.831-.919C19.884 12.846 20 12.469 20 12a2 2 0 00-2-2h-2.172a2 2 0 00-1.414.586l-.828-.828A2.5 2.5 0 0013.586 9H15a1 1 0 100-2h-1.172a2.5 2.5 0 00-1.768.732l-.828-.828A2 2 0 009.172 8H7a2 2 0 00-2 2v4a2 2 0 002 2h5a2 2 0 001.824-1.2z" />
													</svg>
												</div>
												<h4 class="font-semibold text-surface-900 dark:text-surface-100 tracking-tight flex-1 truncate">
													{file.title}
												</h4>
											</div>
											<div class="text-xs text-surface-500 dark:text-surface-400 mt-1 font-mono">
												{file.filename} • {(file.fileSize! / 1024 / 1024).toFixed(2)}MB
											</div>
											{#if file.description}
												<p class="text-sm text-surface-600 dark:text-surface-400 mt-2 leading-relaxed">
													{file.description}
												</p>
											{/if}
										</div>
										<button
											type="button"
											onclick={() => removeSupplementaryFile(index)}
											class="ml-2 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-error-50 dark:hover:bg-error-900/20"
											title="Remove file"
											aria-label="Remove file"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="bg-gradient-to-b from-surface-50 to-white dark:from-surface-800 dark:to-surface-900 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
					<div class="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
						Add Supplementary Files
					</div>

					{#if supplementaryUploadError}
						<div class="mb-3 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-700 rounded-lg text-sm text-error-700 dark:text-error-300">
							{supplementaryUploadError}
						</div>
					{/if}

					<!-- Storage Usage Indicator -->
					<div class="mb-4 p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
						<div class="flex items-center justify-between mb-2">
							<span class="text-xs font-medium text-surface-600 dark:text-surface-400">Total Storage Used</span>
							<span class="text-xs font-semibold text-surface-700 dark:text-surface-300">
								{getFormattedSize(getCurrentUsedSize())} / {SUPPLEMENTARY_FILES_TOTAL_LIMIT_LABEL}
							</span>
						</div>
						<div class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
							<div 
								class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
								style="width: {(getCurrentUsedSize() / MAX_TOTAL_SIZE) * 100}%"
							></div>
						</div>
						<p class="text-xs text-surface-500 dark:text-surface-400 mt-2">
							Available space: {getFormattedSize(getAvailableSpace())}
						</p>
					</div>

					<div class="grid grid-cols-1 gap-3">
						<div class="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-6 hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
							<label for="supplementary-file-input" class="block mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
								Select one or more files (any format, max {getFormattedSize(getAvailableSpace())})
							</label>
							<input
								id="supplementary-file-input"
								type="file"
								onchange={handleSupplementaryFileInputChange}
								multiple
								class="block w-full text-sm text-surface-700 dark:text-surface-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700"
								disabled={isUploadingSupplementaryFiles || getAvailableSpace() <= 0}
							/>
						</div>

						{#if pendingSupplementaryFiles.length > 0}
							<div class="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg">
								<p class="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
									{pendingSupplementaryFiles.length} file(s) selected and ready for upload
								</p>
								<div class="space-y-2 max-h-48 overflow-auto">
									{#each pendingSupplementaryFiles as pending, index}
										<div class="flex items-center justify-between gap-2 text-xs bg-white dark:bg-surface-800 border border-primary-200 dark:border-primary-800 rounded-md p-2">
											<div class="min-w-0">
												<p class="font-medium text-surface-800 dark:text-surface-200 truncate">{pending.filename}</p>
												<p class="text-surface-500 dark:text-surface-400">{(pending.fileSize! / 1024 / 1024).toFixed(2)}MB</p>
											</div>
											<button
												type="button"
												onclick={() => removePendingSupplementaryFile(index)}
												class="text-error-600 hover:text-error-700 text-xs px-2 py-1 rounded hover:bg-error-50 dark:hover:bg-error-900/20"
											>
												Remove
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="text-xs text-surface-600 dark:text-surface-400">
							{#if pendingSupplementaryFiles.length > 0}
								Ready to upload. Click "Upload Selected Files".
							{:else}
								Choose one or more files to enable batch upload.
							{/if}
						</div>

						<button
							type="button"
							onclick={uploadPendingSupplementaryFiles}
							disabled={pendingSupplementaryFiles.length === 0 || isUploadingSupplementaryFiles}
							class="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:from-surface-300 disabled:to-surface-300 dark:disabled:from-surface-700 dark:disabled:to-surface-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
						>
							{isUploadingSupplementaryFiles ? 'Uploading files...' : 'Upload Selected Files'}
						</button>
					</div>
				</div>
			</section>

			<div class="mt-4">
				<h5 class="text-lg font-semibold mb-1">Paper Cover Image <span class="text-primary-600 dark:text-primary-400">(Main/Featured)</span></h5>
				<p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
					Upload one main image that will appear at the beginning of your article. Selecting a new image replaces the current cover. This field is optional.
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
								<span>{imageItems.length > 0 ? 'Replace Image' : 'Add Image'}</span>
							</button>
						</FileUpload>
					</div>

					{#if imageItems.length > 0}
						<div class="grid grid-cols-1 gap-2 mt-4">
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
						class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 [&>*:first-child]:mb-7 [&>*:first-child]:border-b [&>*:first-child]:border-surface-200 [&>*:first-child]:pb-4 [&>*:first-child]:text-3xl [&>*:first-child]:font-bold [&>*:first-child]:leading-tight [&>*:first-child]:tracking-normal [&>*:first-child]:text-surface-950 [&>*:first-child]:break-words md:[&>*:first-child]:text-4xl paper-content paper-preview-content"
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
		<button
			class="bg-primary-500 text-white rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={hdlSaveDraft}
			disabled={isSavingPaper}
		>
			{isSavingPaper ? 'Saving...' : 'Save Draft'}
		</button>
		{#if page.url.pathname.includes('edit')}
			<button
				class="bg-primary-500 text-white rounded-lg px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
				onclick={hdlSubmit}
				disabled={isSavingPaper}
			>
				Submit Article
			</button>
		{/if}
	</div>

	<!-- Submission Confirmation Modal -->
	{#if showSubmitModal}
		<div class="fixed inset-0 z-50 overflow-y-auto">
			<button
				type="button"
				class="absolute inset-0 w-full h-full bg-black bg-opacity-50"
				onclick={cancelSubmit}
				aria-label="Close confirmation modal"
			></button>
			<div class="relative z-10 flex min-h-full items-start justify-center p-4 py-8 sm:items-center">
				<div class="flex max-h-[calc(100dvh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="submit-confirmation-title">
				<div class="overflow-y-auto p-6">
				<h2 id="submit-confirmation-title" class="text-2xl font-bold text-gray-900 mb-4">Confirm Submission</h2>

				<div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<p class="text-yellow-800 font-semibold mb-2">Important: This action cannot be undone!</p>
					<p class="text-gray-700">Once you submit your article for review, you will not be able to edit it until the review process is complete.</p>
				</div>

				<div class="mb-6">
					<p class="text-gray-700 mb-3 font-semibold">Please verify the following before submitting:</p>
					<ul class="list-disc list-inside space-y-1 text-gray-700 text-sm ml-2">
						<li>All required information is complete and accurate</li>
						<li>DOCX files are uploaded correctly</li>
						<li>All authors and affiliations are correct</li>
						<li>Keywords and subject areas are appropriate</li>
						<li>Abstract accurately represents your work</li>
					</ul>
				</div>

				<div class="mb-4">
					<label class="flex items-start gap-2 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={confirmInformationAccurate}
							class="mt-1 w-4 h-4 text-primary-500 rounded"
						/>
						<span class="text-sm text-gray-700">
							I confirm that all information submitted in this article is accurate and truthful. I understand that submitting false or misleading information may result in rejection or retraction of the article.
						</span>
					</label>
				</div>

				<div class="mb-6">
					<label class="flex items-start gap-2 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={confirmPoliciesAgreed}
							class="mt-1 w-4 h-4 text-primary-500 rounded"
						/>
						<span class="text-sm text-gray-700">
							I have read and agree to the <a href="/policies" target="_blank" class="text-primary-500 hover:text-primary-600 underline font-semibold">platform policies</a>, including publishing ethics, data sharing, and conflict of interest guidelines.
						</span>
					</label>
				</div>

				</div>
				<div class="flex flex-shrink-0 gap-3 justify-end border-t border-gray-200 bg-white p-4">
					<button
						class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
						onclick={cancelSubmit}
					>
						Cancel
					</button>
					<button
						class="px-4 py-2 text-white rounded-lg {(confirmInformationAccurate && confirmPoliciesAgreed && !isSavingPaper) ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-400 cursor-not-allowed'}"
						onclick={confirmSubmit}
						disabled={!confirmInformationAccurate || !confirmPoliciesAgreed || isSavingPaper}
					>
						{isSavingPaper ? 'Submitting...' : 'Confirm & Submit'}
					</button>
				</div>
				</div>
			</div>
		</div>
	{/if}
</main>
