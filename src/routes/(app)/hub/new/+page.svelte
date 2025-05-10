<script lang="ts">
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';
	import IconDropzone from '@lucide/svelte/icons/image-plus';
	import IconFile from '@lucide/svelte/icons/paperclip';
	import IconRemove from '@lucide/svelte/icons/circle-x';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';

	let form = {
		name: '',
		type: 'Conference',
		description: '',
		location: '',
		issn: '',
		guidelinesUrl: '',
		acknowledgement: '',
		licenses: [] as string[],
		extensions: '',
		logoUrl: '',
		bannerUrl: '',
		cardUrl: '',
		peerReview: 'Everyone',
		authorInvite: 'Yes',
		identityVisibility: 'Everyone',
		reviewVisibility: 'Everyone',
		twitter: '',
		facebook: '',
		website: '',
		tracks: '',
		calendar: '',
		showCalendar: false,
		dates: {
			submissionStart: '',
			submissionEnd: '',
			eventStart: '',
			eventEnd: ''
		}
	};

	interface ImageItem {
		id?: string;
		file?: File;
		previewUrl: string;
	}

	interface HubDates {
		submissionStart: string;
		submissionEnd: string;
		eventStart: string;
		eventEnd: string;
	}

	let logoItem: ImageItem | null = $state(
		form.logoUrl
			? {
					id: form.logoUrl,
					previewUrl: `/api/images/${form.logoUrl}`
				}
			: null
	);

	let bannerItem: ImageItem | null = $state(
		form.bannerUrl
			? {
					id: form.bannerUrl,
					previewUrl: `/api/images/${form.bannerUrl}`
				}
			: null
	);

	let cardItem: ImageItem | null = $state(
		form.cardUrl
			? {
					id: form.cardUrl,
					previewUrl: `/api/images/${form.cardUrl}`
				}
			: null
	);

	async function handleLogoUpload(event: any) {
		const file = event.acceptedFiles[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			logoItem = { file, previewUrl: e.target?.result as string };
		};
		reader.readAsDataURL(file);
	}

	/* async function handleBannerUpload(event: any) {
		const file = event.acceptedFiles[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			bannerItem = { file, previewUrl: e.target?.result as string };
		};
		reader.readAsDataURL(file);
	} */

	async function handleCardUpload(event: any) {
		const file = event.acceptedFiles[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			cardItem = { file, previewUrl: e.target?.result as string };
		};
		reader.readAsDataURL(file);
	}

	async function saveImages() {
		// Upload logo if exists
		if (logoItem?.file) {
			const formData = new FormData();
			formData.append('file', logoItem.file);
			const response = await fetch('/api/images/upload', {
				method: 'POST',
				body: formData
			});
			const data = await response.json();
			form.logoUrl = data.id;
		}

		// Upload banner if exists
		if (bannerItem?.file) {
			const formData = new FormData();
			formData.append('file', bannerItem.file);
			const response = await fetch('/api/images/upload', {
				method: 'POST',
				body: formData
			});
			const data = await response.json();
			form.bannerUrl = data.id;
		}

		// Upload card if exists
		if (cardItem?.file) {
			const formData = new FormData();
			formData.append('file', cardItem.file);
			const response = await fetch('/api/images/upload', {
				method: 'POST',
				body: formData
			});
			const data = await response.json();
			form.cardUrl = data.id;
		}
	}

	function toggleLicense(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		const value = checkbox.value;
		if (checkbox.checked) {
			form.licenses = [...form.licenses, value];
		} else {
			form.licenses = form.licenses.filter((l) => l !== value);
		}
	}
	function handleSubmit() {
		const formData = {
			...form,
			dates: {
				submissionStart: form.dates.submissionStart,
				submissionEnd: form.dates.submissionEnd,
				eventStart: form.dates.eventStart,
				eventEnd: form.dates.eventEnd
			}
		};
		console.log('Submitted form:', formData);
		// Submit to API
	}

	async function uploadFile(file: File): Promise<string> {
		// Example implementation for file upload
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error('Failed to upload file');
		}

		const data = await response.json();
		return data.url; // Assuming the API returns the uploaded file's URL in `data.url`
	}
</script>

<div class="space-y-6">
	<h2 class="text-2xl font-bold">Edit Hub</h2>
	<p class="text-gray-600">Edit and manage the information displayed about your hub</p>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Hub Details</h3>
		<input bind:value={form.name} class="w-full p-2 border rounded" placeholder="Name" />
		<select bind:value={form.type} class="w-full p-2 border rounded">
			<option>Conference</option>
			<option>Journal</option>
			<option>Working Group</option>
		</select>
		<textarea
			bind:value={form.description}
			class="w-full p-2 border rounded"
			rows="3"
			placeholder="Description"
		></textarea>
		<input bind:value={form.location} class="w-full p-2 border rounded" placeholder="Location" />
		<input bind:value={form.issn} class="w-full p-2 border rounded" placeholder="ISSN Code" />
		<input
			bind:value={form.guidelinesUrl}
			class="w-full p-2 border rounded"
			placeholder="Guidelines URL"
		/>
		<textarea
			bind:value={form.acknowledgement}
			class="w-full p-2 border rounded"
			rows="2"
			placeholder="Acknowledgement"
		></textarea>
	</div>
	<RichTextEditor
		bind:content={form.acknowledgement}
		class="w-full p-2 border rounded"
		placeholder="Description"
	></RichTextEditor>

	<!-- <section class="mb-4 w-full">
		<label for="abstract" class="block mb-1">Abstract</label>
		<RichTextEditor
			id="abstract"
			bind:content={$store.abstract}
			placeholder="Enter the abstract..."
		/>
	</section> -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Authorized Licenses</h3>
		<div class="flex gap-4">
			<label><input type="checkbox" value="cc by" onchange={(e) => toggleLicense(e)} /> CC BY</label
			>
			<label
				><input type="checkbox" value="cc by-sa" onchange={(e) => toggleLicense(e)} /> CC BY-SA</label
			>
		</div>
		<input
			bind:value={form.extensions}
			class="w-full p-2 border rounded"
			placeholder=".pdf, .docx, .tex"
		/>
	</div>

	<!-- Images -->
	<div class="space-y-6">
		<h3 class="text-xl font-semibold">Images</h3>

		<!-- Upload Buttons Row -->
		<div class="flex gap-4">
			<!-- Logo Upload Button -->
			<div class="w-40">
				<FileUpload name="logo-image" onFileChange={handleLogoUpload} maxFiles={1} accept="image/*">
					<div
						class="border-2 border-dashed border-surface-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary-500 transition-colors duration-200 group cursor-pointer"
					>
						<IconDropzone
							class="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors duration-200"
						/>
						<span class="mt-1 text-sm font-medium text-gray-600 group-hover:text-gray-900"
							>Add Logo Image</span
						>
					</div>
				</FileUpload>
			</div>

			<!-- Card Upload Button -->
			<div class="w-40">
				<FileUpload name="card-image" onFileChange={handleCardUpload} maxFiles={1} accept="image/*">
					<div
						class="border-2 border-dashed border-surface-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary-500 transition-colors duration-200 group cursor-pointer"
					>
						<IconDropzone
							class="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors duration-200"
						/>
						<span class="mt-1 text-sm font-medium text-gray-600 group-hover:text-gray-900"
							>Add Card Image</span
						>
					</div>
				</FileUpload>
			</div>
		</div>

		<!-- Preview Card -->
		{#if cardItem}
			<div class="relative w-full max-w-2xl bg-gray-50 rounded-lg overflow-hidden">
				<img src={cardItem.previewUrl} alt="Card preview" class="w-full h-64 object-cover" />
				{#if logoItem}
					<img
						src={logoItem.previewUrl}
						alt="Logo preview"
						class="absolute bottom-4 left-4 w-20 h-20 object-cover rounded-full border-4 border-white shadow-lg"
					/>
				{/if}
				<button
					class="absolute top-4 right-4 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors duration-200"
					onclick={() => {
						cardItem = null;
						form.cardUrl = '';
					}}
				>
					<IconRemove class="w-4 h-4" />
				</button>
			</div>
		{:else if logoItem}
			<!-- Show only logo preview if no card is uploaded -->
			<div class="relative w-40">
				<img
					src={logoItem.previewUrl}
					alt="Logo preview"
					class="w-full h-40 object-cover rounded-full border-4 border-white shadow-lg"
				/>
				<button
					class="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors duration-200"
					onclick={() => {
						logoItem = null;
						form.logoUrl = '';
					}}
				>
					<IconRemove class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Peer Review Configuration</h3>
		Who can create peer reviews?
		<select bind:value={form.peerReview} class="w-full p-2 border rounded">
			<option>Everyone</option>
			<option>Only invited reviewers</option>
		</select>
		Can authors invite reviewers to their publications?
		<select bind:value={form.authorInvite} class="w-full p-2 border rounded">
			<option>Yes</option>
			<option>No</option>
		</select>
		Who can see the reviewer identity?
		<select bind:value={form.identityVisibility} class="w-full p-2 border rounded">
			<option>Everyone</option>
			<option>Only author</option>
			<option>No one</option>
		</select>
		Who can see the review?
		<select bind:value={form.reviewVisibility} class="w-full p-2 border rounded">
			<option>Everyone</option>
			<option>Only author and editors</option>
			<option>Only editors</option>
		</select>
	</div>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Social Links</h3>
		<input bind:value={form.twitter} class="w-full p-2 border rounded" placeholder="Twitter" />
		<input bind:value={form.facebook} class="w-full p-2 border rounded" placeholder="Facebook" />
		<input bind:value={form.website} class="w-full p-2 border rounded" placeholder="Website" />
	</div>

	<div>
		<h3 class="text-xl font-semibold">Tracks</h3>
		<textarea
			bind:value={form.tracks}
			class="w-full p-2 border rounded"
			rows="3"
			placeholder="Tracks or topics"
		></textarea>
	</div>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Hub Calendar</h3>

		<div class="bg-gray-50 p-6 rounded-lg space-y-6">
			<!-- Submission Dates -->
			<div class="space-y-4">
				<h4 class="font-medium text-gray-700">Submission Period</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="block text-sm text-gray-600">Start Date</label>
						<input
							type="date"
							bind:value={form.dates.submissionStart}
							class="w-full p-2 border rounded"
						/>
					</div>
					<div class="space-y-2">
						<label class="block text-sm text-gray-600">End Date</label>
						<input
							type="date"
							bind:value={form.dates.submissionEnd}
							class="w-full p-2 border rounded"
							min={form.dates.submissionStart}
						/>
					</div>
				</div>
			</div>

			<!-- Event Dates -->
			<div class="space-y-4">
				<h4 class="font-medium text-gray-700">Event Period</h4>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="block text-sm text-gray-600">Start Date</label>
						<input
							type="date"
							bind:value={form.dates.eventStart}
							class="w-full p-2 border rounded"
							min={form.dates.submissionEnd}
						/>
					</div>
					<div class="space-y-2">
						<label class="block text-sm text-gray-600">End Date</label>
						<input
							type="date"
							bind:value={form.dates.eventEnd}
							class="w-full p-2 border rounded"
							min={form.dates.eventStart}
						/>
					</div>
				</div>
			</div>

			<!-- Timeline Preview -->
			{#if form.dates.submissionStart && form.dates.eventEnd}
				<div class="mt-6 p-4 bg-white rounded-lg border">
					<h4 class="font-medium text-gray-700 mb-4">Timeline</h4>
					<div class="space-y-3">
						<div class="flex items-center gap-4">
							<div class="w-32 text-sm font-medium">Submissions Open:</div>
							<div class="text-gray-600">
								{new Date(form.dates.submissionStart).toLocaleDateString()}
							</div>
						</div>
						<div class="flex items-center gap-4">
							<div class="w-32 text-sm font-medium">Submissions Close:</div>
							<div class="text-gray-600">
								{new Date(form.dates.submissionEnd).toLocaleDateString()}
							</div>
						</div>
						<div class="flex items-center gap-4">
							<div class="w-32 text-sm font-medium">Event Starts:</div>
							<div class="text-gray-600">
								{new Date(form.dates.eventStart).toLocaleDateString()}
							</div>
						</div>
						<div class="flex items-center gap-4">
							<div class="w-32 text-sm font-medium">Event Ends:</div>
							<div class="text-gray-600">
								{new Date(form.dates.eventEnd).toLocaleDateString()}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<label class="inline-flex items-center mt-2">
			<input type="checkbox" bind:checked={form.showCalendar} class="mr-2" />
			Show calendar on hub landing page
		</label>
	</div>

	<button
		onclick={handleSubmit}
		class="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
	>
		Save
	</button>
</div>
