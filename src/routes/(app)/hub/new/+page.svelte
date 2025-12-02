<script lang="ts">
	import { Accordion, FileUpload } from '@skeletonlabs/skeleton-svelte';
	import IconDropzone from '@lucide/svelte/icons/image-plus';
	import IconRemove from '@lucide/svelte/icons/circle-x';
	import RichTextEditor from '$lib/components/Text/RichTextEditor.svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	let { data } = $props();

	let user = data.user;

	let form = {
		createdBy: user,
		title: '',
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
		peerReview: '',
		authorInvite: '',
		identityVisibility: '',
		reviewVisibility: '',
		tracks: '',
		calendar: '',
		showCalendar: false,
		dates: {
			submissionStart: '',
			submissionEnd: '',
			eventStart: '',
			eventEnd: ''
		},
		socialMedia: {
			twitter: '',
			facebook: '',
			website: '',
			instagram: '',
			linkedin: '',
			youtube: '',
			tiktok: '',
			github: '',
			discord: '',
			telegram: '',
			whatsapp: '',
			wechat: ''
		}
	};
// 	let form = {
// 		createdBy: user,
// 		title: 'Fórum Latino-Americano de Sustentabilidade e Inovação Social 2025',
// 		type: 'Conference',
// 		description: `
// Evento internacional dedicado à discussão de soluções tecnológicas e sociais para os principais desafios ambientais, econômicos e humanitários da atualidade. Serão abordados temas como economia circular, educação ambiental, governança climática e inovação social em comunidades de baixa renda.
// 	`,
// 		location: 'Medellín, Colômbia',
// 		issn: '2440-1123',
// 		guidelinesUrl: 'https://forum2025.org/submissoes',
// 		acknowledgement: `
// Este evento conta com o apoio do Ministério do Meio Ambiente, universidades da América Latina e redes de pesquisa social. Submissões devem seguir as diretrizes do site oficial. Os trabalhos serão avaliados por especialistas em sistema duplo-cego e os melhores serão convidados para revista parceira.
// 	`,
// 		licenses: ['CC BY-NC 4.0'],
// 		extensions: '',
// 		logoUrl: 'logo-forum2025.png',
// 		bannerUrl: 'banner-forum2025.jpg',
// 		cardUrl: 'card-forum2025.jpg',
// 		peerReview: 'Only Reviewers',
// 		authorInvite: 'Yes',
// 		identityVisibility: 'Hidden',
// 		reviewVisibility: 'Reviewers Only',
// 		tracks: 'Inovação Social, Sustentabilidade, Educação Ambiental',
// 		calendar: '',
// 		showCalendar: false,
// 		dates: {
// 			submissionStart: '2025-03-01',
// 			submissionEnd: '2025-06-30',
// 			eventStart: '2025-09-15',
// 			eventEnd: '2025-09-17'
// 		},
// 		socialMedia: {
// 			twitter: '',
// 			facebook: '',
// 			website: 'https://forum2025.org',
// 			instagram: 'forum2025',
// 			linkedin: '',
// 			youtube: 'channel/UCForum2025',
// 			tiktok: '',
// 			github: '',
// 			discord: '',
// 			telegram: '',
// 			whatsapp: '',
// 			wechat: '',
// 			weibo: '',
// 			pinterest: ''
// 		},
// 		reviewers: [],
// 		submittedPapers: [],
// 		status: 'open',
// 		createdAt: '',
// 		updatedAt: ''
// 	};

	// 	let form = {
	// 		createdBy: user,
	// 		title: 'Congresso Internacional de Inovação e Tecnologia 2025',
	// 		type: 'Conference',
	// 		description: `
	// O Congresso Internacional de Inovação e Tecnologia 2025 é um dos maiores eventos acadêmicos e profissionais da América Latina, reunindo pesquisadores, desenvolvedores, engenheiros, estudantes e representantes da indústria. O evento visa fomentar o debate científico, apresentar avanços tecnológicos e promover a colaboração entre academia e mercado.

	// Durante cinco dias, serão abordadas temáticas emergentes como inteligência artificial, computação quântica, sustentabilidade digital, ciência de dados aplicada à saúde e sistemas ciberfísicos. A programação contará com palestras magnas, workshops práticos, painéis interativos e sessões técnicas de apresentação de artigos científicos.

	// Além disso, o evento oferece oportunidades únicas de networking, sessões de mentoria, competições acadêmicas e stands de empresas que estão moldando o futuro da tecnologia. Os melhores artigos serão convidados para submissão estendida em periódicos parceiros de alto impacto.
	// 	`,
	// 		location: 'São Paulo, Brasil',
	// 		issn: '2318-5567',
	// 		guidelinesUrl: 'https://www.evento2025.org/diretrizes',
	// 		acknowledgement: `
	// Agradecemos aos nossos patrocinadores principais: Fundação Nacional de Pesquisa, Agência de Inovação Tecnológica, Universidade Federal de Tecnologia e todos os voluntários.

	// 📌 Regras de Submissão:
	// - Submissões devem seguir o modelo oficial disponível no site;
	// - Artigos com até 10 páginas, incluindo referências;
	// - Idiomas aceitos: Português ou Inglês;
	// - Revisão por pares será do tipo single-blind;
	// - Pelo menos um autor deve estar inscrito no evento.

	// ✅ Publicação:
	// - Todos os artigos aceitos serão publicados com DOI individual;
	// - Licença Creative Commons Attribution 4.0 (CC BY 4.0);
	// - Apresentação obrigatória (presencial ou remota).

	// 📣 Informações adicionais:
	// Consulte o site oficial para datas específicas, templates e política de reembolso.
	// 	`,
	// 		licenses: ['CC BY 4.0', 'MIT'],
	// 		extensions:
	// 			'Os autores podem submeter materiais complementares como datasets, vídeos de demonstração e códigos-fonte via GitHub.',
	// 		logoUrl: '232cefe0-e82c-4ece-97ba-29600dead1bb',
	// 		bannerUrl: 'banner-evento2025.jpg',
	// 		cardUrl: 'fa6f25c9-4a67-483c-8823-bc7ca0001fb2',
	// 		peerReview: 'Everyone',
	// 		authorInvite: 'Yes',
	// 		identityVisibility: 'Everyone',
	// 		reviewVisibility: 'Everyone',
	// 		tracks:
	// 			'Inteligência Artificial, Computação Quântica, Sustentabilidade Digital, Bioinformática',
	// 		calendar: 'https://www.evento2025.org/calendario',
	// 		showCalendar: true,
	// 		dates: {
	// 			submissionStart: '2025-05-17',
	// 			submissionEnd: '2025-10-17',
	// 			eventStart: '2025-11-05',
	// 			eventEnd: '2025-11-09'
	// 		},
	// 		socialMedia: {
	// 			twitter: 'evento2025',
	// 			facebook: 'evento2025oficial',
	// 			website: 'https://www.evento2025.org',
	// 			instagram: 'evento2025br',
	// 			linkedin: 'company/evento2025',
	// 			youtube: 'channel/UCEvento2025',
	// 			tiktok: 'evento.2025',
	// 			github: 'evento2025/conferencias',
	// 			discord: 'https://discord.gg/evento2025',
	// 			telegram: 'https://t.me/evento2025',
	// 			whatsapp: 'https://wa.me/5511999998888',
	// 			wechat: 'evento2025wechat',
	// 			weibo: 'evento2025cn',
	// 			pinterest: 'evento2025ideas'
	// 		}
	// 	};

	const lorem =
		'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Sit esse nisi eligendi fuga! Quas nisi repellat adipisci animi repellendus incidunt laborum sunt qui nesciunt, ducimus saepe sapiente sed ut labore. Lorem ipsum dolor, sit amet consectetur adipisicing elit. Sit esse nisi eligendi fuga! Quas nisi repellat adipisci animi repellendus incidunt laborum sunt qui nesciunt, ducimus saepe sapiente sed ut labore.';

	let value = $state(['club']);

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
		try {
			// Upload logo if exists
			if (logoItem?.file) {
				const formData = new FormData();
				formData.append('image', logoItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				console.log('Logo upload response:', data);
				if (data.id) {
					form.logoUrl = data.id;
				}
			}

			// Upload banner if exists
			if (bannerItem?.file) {
				const formData = new FormData();
				formData.append('image', bannerItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				console.log('Banner upload response:', data);
				if (data.id) {
					form.bannerUrl = data.id;
				}
			}

			// Upload card if exists
			if (cardItem?.file) {
				const formData = new FormData();
				formData.append('image', cardItem.file);
				const response = await fetch('/api/images/upload', {
					method: 'POST',
					body: formData
				});
				const data = await response.json();
				console.log('Card upload response:', data);
				if (data.id) {
					form.cardUrl = data.id;
				}
			}
			
			console.log('All images uploaded. Form URLs:', {
				logoUrl: form.logoUrl,
				bannerUrl: form.bannerUrl,
				cardUrl: form.cardUrl
			});
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
		console.log('Form Data before image upload:', form);
		try {
			// First save any uploaded images
			await saveImages();
			
			console.log('Form Data after image upload:', form);

			const formData = {
				...form,
				dates: {
					submissionStart: form.dates.submissionStart,
					submissionEnd: form.dates.submissionEnd,
					eventStart: form.dates.eventStart,
					eventEnd: form.dates.eventEnd
				}
			};
			
			console.log('Sending to server:', formData);

			const response = await fetch('/hub/new', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const data = await response.json();

			console.log('Response:', data);

			if (data.hub) {
				goto('/hub');
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
	<h2 class="text-2xl font-bold">Edit Hub</h2>

	<p class="text-gray-600">Edit and manage the information displayed about your hub</p>

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
		<!-- <input
			bind:value={form.guidelinesUrl}
			class="w-full p-2 border rounded"
			placeholder="Guidelines URL"
		/> -->

		<!-- <textarea
			bind:value={form.acknowledgement}
			class="w-full p-2 border rounded"
			rows="2"
			placeholder="Acknowledgement"
		></textarea> -->

		<RichTextEditor
			id="acknowledgement"
			bind:content={form.acknowledgement}
			placeholder="Enter the abstract..."
		/>
	</div>

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
			<option>Only Reviewers</option>
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

	<Accordion {value} onValueChange={(e) => (value = e.value)} collapsible>
		<hr class="hr" />
		<Accordion.Item value="social links">
			<!-- Control -->
			{#snippet lead()}{/snippet}
			{#snippet control()}<h3 class="text-xl font-semibold">Social Links</h3>{/snippet}
			<!-- Panel -->
			{#snippet panel()}<div class="space-y-4">
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
								<Icon icon="mdi:discord" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.discord}
								class="w-full pl-10 p-2 border rounded"
								placeholder="Discord"
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
								placeholder="Telegram"
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
								placeholder="WhatsApp"
							/>
						</div>

						<!-- WeChat -->
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Icon icon="mdi:wechat" class="text-gray-500" width="20" />
							</div>
							<input
								bind:value={form.socialMedia.wechat}
								class="w-full pl-10 p-2 border rounded"
								placeholder="WeChat"
							/>
						</div>
					</div>
				</div>{/snippet}
		</Accordion.Item>
		<hr class="hr" />
	</Accordion>

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
						<label for="submission-start" class="block text-sm text-gray-600">Start Date</label>
						<input
							id="submission-start"
							type="date"
							bind:value={form.dates.submissionStart}
							class="w-full p-2 border rounded"
						/>
					</div>
					<div class="space-y-2">
						<label for="submission-end" class="block text-sm text-gray-600">End Date</label>
						<input
							id="submission-end"
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
						<label for="event-start" class="block text-sm text-gray-600">Start Date</label>
						<input
							id="event-start"
							type="date"
							bind:value={form.dates.eventStart}
							class="w-full p-2 border rounded"
							min={form.dates.submissionEnd}
						/>
					</div>
					<div class="space-y-2">
						<label for="event-end" class="block text-sm text-gray-600">End Date</label>
						<input
							id="event-end"
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
