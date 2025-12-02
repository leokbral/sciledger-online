<script lang="ts">
	import { Accordion, FileUpload } from '@skeletonlabs/skeleton-svelte';
	import IconDropzone from '@lucide/svelte/icons/image-plus';
	import IconRemove from '@lucide/svelte/icons/circle-x';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	let { data } = $props();

	let user = data.user;
	let hub = data.hub;

	let form = {
		title: hub.title || '',
		type: hub.type || 'Conference',
		description: hub.description || '',
		location: hub.location || '',
		issn: hub.issn || '',
		guidelinesUrl: hub.guidelinesUrl || '',
		acknowledgement: hub.acknowledgement || '',
		licenses: hub.licenses || [],
		extensions: hub.extensions || '',
		logoUrl: hub.logoUrl || '',
		bannerUrl: hub.bannerUrl || '',
		cardUrl: hub.cardUrl || '',
		peerReview: hub.peerReview || '',
		authorInvite: hub.authorInvite || '',
		identityVisibility: hub.identityVisibility || '',
		reviewVisibility: hub.reviewVisibility || '',
		tracks: hub.tracks || '',
		calendar: hub.calendar || '',
		showCalendar: hub.showCalendar || false,
		dates: {
			submissionStart: hub.dates?.submissionStart || '',
			submissionEnd: hub.dates?.submissionEnd || '',
			eventStart: hub.dates?.eventStart || '',
			eventEnd: hub.dates?.eventEnd || ''
		},
		socialMedia: {
			twitter: hub.socialMedia?.twitter || '',
			facebook: hub.socialMedia?.facebook || '',
			website: hub.socialMedia?.website || '',
			instagram: hub.socialMedia?.instagram || '',
			linkedin: hub.socialMedia?.linkedin || '',
			youtube: hub.socialMedia?.youtube || '',
			tiktok: hub.socialMedia?.tiktok || '',
			github: hub.socialMedia?.github || '',
			discord: hub.socialMedia?.discord || '',
			telegram: hub.socialMedia?.telegram || '',
			whatsapp: hub.socialMedia?.whatsapp || '',
			wechat: hub.socialMedia?.wechat || ''
		}
	};

	let value = $state(['club']);

	interface ImageItem {
		id?: string;
		file?: File;
		previewUrl: string;
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
		try {
			// Upload logo if exists and is new
			if (logoItem?.file) {
				const formData = new FormData();
				formData.append('image', logoItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				if (data.id) {
					form.logoUrl = data.id;
				}
			}

			// Upload banner if exists and is new
			if (bannerItem?.file) {
				const formData = new FormData();
				formData.append('image', bannerItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				if (data.id) {
					form.bannerUrl = data.id;
				}
			}

			// Upload card if exists and is new
			if (cardItem?.file) {
				const formData = new FormData();
				formData.append('image', cardItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				if (data.id) {
					form.cardUrl = data.id;
				}
			}
		} catch (error) {
			console.error('Error uploading images:', error);
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

	async function handleSubmit() {
		try {
			// First save any uploaded images
			await saveImages();

			const formData = {
				...form,
				dates: {
					submissionStart: form.dates.submissionStart,
					submissionEnd: form.dates.submissionEnd,
					eventStart: form.dates.eventStart,
					eventEnd: form.dates.eventEnd
				}
			};

			const response = await fetch(`/hub/edit/${hub._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const data = await response.json();

			if (data.hub) {
				goto(`/hub/view/${hub._id}`);
			} else {
				alert(`Issue! ${JSON.stringify(data)}`);
			}
		} catch (error) {
			console.error(error);
			alert('An error occurred. Please try again.');
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold">Edit Hub</h2>
			<p class="text-gray-600">Edit and manage the information displayed about your hub</p>
		</div>
		<a href="/hub/view/{hub._id}" class="btn preset-tonal">
			<Icon icon="mdi:arrow-left" width="20" />
			Back to Hub
		</a>
	</div>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Hub Details</h3>
		<input bind:value={form.title} class="w-full p-2 border rounded" placeholder="Name" />
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

		<RichTextEditor
			id="acknowledgement"
			bind:content={form.acknowledgement}
			placeholder="Enter acknowledgement and rules..."
		/>
	</div>

	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Authorized Licenses</h3>
		<div class="flex gap-4">
			<label>
				<input 
					type="checkbox" 
					value="cc by" 
					checked={form.licenses.includes('cc by')}
					onchange={(e) => toggleLicense(e)} 
				/> CC BY
			</label>
			<label>
				<input 
					type="checkbox" 
					value="cc by-sa" 
					checked={form.licenses.includes('cc by-sa')}
					onchange={(e) => toggleLicense(e)} 
				/> CC BY-SA
			</label>
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
							>Change Logo</span
						>
					</div>
				</FileUpload>
			</div>

			<!-- Card Upload Button -->
			<div class="flex-1">
				<FileUpload name="card-image" onFileChange={handleCardUpload} maxFiles={1} accept="image/*">
					<div
						class="border-2 border-dashed border-surface-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary-500 transition-colors duration-200 group cursor-pointer"
					>
						<IconDropzone
							class="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors duration-200"
						/>
						<span class="mt-1 text-sm font-medium text-gray-600 group-hover:text-gray-900"
							>Change Card Image</span
						>
					</div>
				</FileUpload>
			</div>
		</div>

		<!-- Preview -->
		{#if cardItem}
			<div class="relative w-full h-80 rounded-xl overflow-hidden">
				<img src={cardItem.previewUrl} alt="Card preview" class="w-full h-full object-cover" />
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

	<!-- Dates -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Important Dates</h3>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="submission-start" class="block text-sm font-medium mb-1">Submission Start</label>
				<input id="submission-start" type="date" bind:value={form.dates.submissionStart} class="w-full p-2 border rounded" />
			</div>
			<div>
				<label for="submission-end" class="block text-sm font-medium mb-1">Submission End</label>
				<input id="submission-end" type="date" bind:value={form.dates.submissionEnd} class="w-full p-2 border rounded" />
			</div>
			<div>
				<label for="event-start" class="block text-sm font-medium mb-1">Event Start</label>
				<input id="event-start" type="date" bind:value={form.dates.eventStart} class="w-full p-2 border rounded" />
			</div>
			<div>
				<label for="event-end" class="block text-sm font-medium mb-1">Event End</label>
				<input id="event-end" type="date" bind:value={form.dates.eventEnd} class="w-full p-2 border rounded" />
			</div>
		</div>
	</div>

	<!-- Peer Review Settings -->
	<div class="space-y-4">
		<h3 class="text-xl font-semibold">Review Settings</h3>
		<div>
			<label for="peer-review" class="block mb-1">Who can review?</label>
			<select id="peer-review" bind:value={form.peerReview} class="w-full p-2 border rounded">
				<option>Everyone</option>
				<option>Only Reviewers</option>
			</select>
		</div>
		<div>
			<label for="author-invite" class="block mb-1">Author can invite reviewers?</label>
			<select id="author-invite" bind:value={form.authorInvite} class="w-full p-2 border rounded">
				<option>Yes</option>
				<option>No</option>
			</select>
		</div>
		<div>
			<label for="identity-visibility" class="block mb-1">Identity visibility</label>
			<select id="identity-visibility" bind:value={form.identityVisibility} class="w-full p-2 border rounded">
				<option>Everyone</option>
				<option>Only author and editors</option>
				<option>Only editors</option>
				<option>Hidden</option>
			</select>
		</div>
		<div>
			<label for="review-visibility" class="block mb-1">Who can see the review?</label>
			<select id="review-visibility" bind:value={form.reviewVisibility} class="w-full p-2 border rounded">
				<option>Everyone</option>
				<option>Only author and editors</option>
				<option>Only editors</option>
			</select>
		</div>
	</div>

	<Accordion {value} onValueChange={(e) => (value = e.value)} collapsible>
		<hr class="hr" />
		<Accordion.Item value="social links">
			{#snippet lead()}{/snippet}
			{#snippet control()}<h3 class="text-xl font-semibold">Social Links</h3>{/snippet}
			{#snippet panel()}
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<!-- Website -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:web" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.website}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Website URL"
							/>
						</div>

						<!-- Twitter -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:twitter" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.twitter}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Twitter"
							/>
						</div>

						<!-- Facebook -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:facebook" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.facebook}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Facebook"
							/>
						</div>

						<!-- Instagram -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:instagram" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.instagram}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Instagram"
							/>
						</div>

						<!-- LinkedIn -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:linkedin" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.linkedin}
								class="w-full pl-10 p-2 border rounded"
								placeholder="LinkedIn"
							/>
						</div>

						<!-- YouTube -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:youtube" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.youtube}
								class="w-full pl-10 p-2 border rounded"
								placeholder="YouTube"
							/>
						</div>

						<!-- TikTok -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="uit:social-media-logo" width="24" height="24" />
							</div>
							<input
								bind:value={form.socialMedia.tiktok}
								class="w-full pl-10 p-2 border rounded"
								placeholder="TikTok"
							/>
						</div>

						<!-- GitHub -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:github" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.github}
								class="w-full pl-10 p-2 border rounded"
								placeholder="GitHub"
							/>
						</div>

						<!-- Discord -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="ic:baseline-discord" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.discord}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Discord Invite URL"
							/>
						</div>

						<!-- Telegram -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:telegram" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.telegram}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Telegram Link"
							/>
						</div>

						<!-- WhatsApp -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:whatsapp" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.whatsapp}
								class="w-full pl-10 p-2 border rounded"
								placeholder="WhatsApp Link"
							/>
						</div>

						<!-- WeChat -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="ri:wechat-fill" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.wechat}
								class="w-full pl-10 p-2 border rounded"
								placeholder="WeChat ID"
							/>
						</div>
					</div>
				</div>
			{/snippet}
		</Accordion.Item>
	</Accordion>

	<div class="flex gap-4 pt-4">
		<button onclick={handleSubmit} class="btn preset-filled-primary-500 text-white flex-1">
			Save Changes
		</button>
		<a href="/hub/view/{hub._id}" class="btn preset-tonal">
			Cancel
		</a>
	</div>
</div>
