<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { getInitials } from '$lib/utils/GetInitials';
	import ReviewerManagement from '$lib/components/ReviewerManagement/ReviewerManagement.svelte';
	import type { Paper } from '$lib/types/Paper.js';
	import PapersSection from '$lib/components/PapersSection/PapersSection.svelte';

	let { data } = $props();
	const hub = data.hub;
	const papers = data.papers;

	// Enhanced debug logging
	// console.log('Current Hub ID:', hub._id);
	// console.log('Papers before filtering:', papers?.length);

	// Filter papers to only show ones that belong to this hub and are published
	// const filteredPapers = papers?.filter((paper) => {
	// 	return paper.hubId === hub._id && paper.status === 'published';
	// });
	const userId = data.user._id;
	const isCreator = data.hub.createdBy._id === data.user.id;
	const isReviewer = hub.reviewers?.includes(data.user.id);

	const filteredPapers = data.papers?.filter((paper) => {
		// Se for published, todos podem ver
		if (paper.status === 'published') return true;

		// Se for criador ou revisor do hub, pode ver todos os papers do hub
		if (isCreator || isReviewer) return true;

		// Caso contrário, só vê se estiver envolvido no paper
		const isMainAuthor = paper.mainAuthor?.id === userId;
		const isCoAuthor = paper.coAuthors?.some((ca) => ca.id === userId);
		const isCorresponding = paper.correspondingAuthor?.id === userId;
		const isSubmittedBy = paper.submittedBy?.id === userId;

		return isMainAuthor || isCoAuthor || isCorresponding || isSubmittedBy;
	});

	console.log('Papers after filtering:', filteredPapers);

	let openCalendarModal = $state(false);
	let openAcknowledgementModal = $state(false);

	function closeAllModals() {
		openCalendarModal = false;
		openAcknowledgementModal = false;
	}

	// Accept any paper-like object with the expected fields
	const isUserInvolved = (paper: any) => {
		const userId = data.user.id;
		return (
			paper.mainAuthor?.id === userId ||
			(paper.coAuthors &&
				Array.isArray(paper.coAuthors) &&
				paper.coAuthors.some((c: any) => c?.id === userId)) ||
			paper.correspondingAuthor?.id === userId ||
			paper.submittedBy?.id === userId
		);
	};

	// console.log('Quem foi o responsavel foi esse',data.hub.createdBy._id);
	// console.log('Is creator:', isCreator);
	const shouldHighlight = (paper: any) => {
		const isOwnerOrReviewer = isCreator || isReviewer;
		return paper.status !== 'published' && (isUserInvolved(paper) || isOwnerOrReviewer);
	};
</script>

<!-- Banner -->
<!-- <div class="w-full h-80 rounded-2xl overflow-hidden relative">
	{#if hub.bannerUrl}
		<img src={`/api/images/${hub.bannerUrl}`} alt="Banner" class="w-full h-full object-cover" />
	{:else}
		<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">Sem banner</div>
	{/if}
</div> -->

<!-- Card -->
<div class="w-full h-80 rounded-2xl overflow-hidden relative">
	{#if hub.cardUrl}
		<img src={`/api/images/${hub.cardUrl}`} alt="Card" class="w-full h-full object-cover" />
	{:else}
		<div class="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-semibold">
			{hub.title}
		</div>
	{/if}
</div>

<!-- Cabeçalho com logo -->
<div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
	{#if hub.logoUrl}
		<img
			src={`/api/images/${hub.logoUrl}`}
			alt="Logo"
			class="w-28 h-28 object-contain rounded-full"
		/>
	{:else}
		<div class="w-28 h-28 bg-primary-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
			{hub.title.substring(0, 2).toUpperCase()}
		</div>
	{/if}
	<div class="flex-1 flex flex-col justify-between min-h-full">
		<!-- Top section with title, guidelines, and edit button -->
		<div class="flex justify-between items-start">
			<div class="space-y-2">
				<h1 class="text-2xl font-semibold text-gray-900">
					{hub.title} <span class="text-sm text-gray-500 font-normal">{hub.type}</span>
				</h1>

				<!-- Localização -->
				{#if hub.location}
					<div class="flex items-center gap-2 text-gray-600 text-sm mt-2">
						<Icon icon="material-symbols-light:location-on-outline" width="24" height="24" />
						<span>{hub.location}</span>
					</div>
				{/if}

				<!-- ISSN -->
				{#if hub.issn}
					<div class="flex items-center gap-2 text-gray-600 text-sm mt-2">
						<span>ISSN: {hub.issn}</span>
					</div>
				{/if}
			</div>

			<!-- Guidelines and Edit Button -->
			<div class="flex items-center gap-4">
				{#if hub.guidelinesUrl}
					<a
						href={hub.guidelinesUrl}
						target="_blank"
						class="flex items-center gap-2 text-blue-600 hover:text-blue-700"
					>
						<Icon icon="mdi:file-document-outline" width="24" height="24" />
						<span class="underline">Guidelines</span>
					</a>
				{/if}
				
				{#if isCreator}
					<a
						href="/hub/edit/{hub._id}"
						class="btn preset-tonal flex items-center gap-2"
					>
						<Icon icon="mdi:pencil" width="20" />
						Edit Hub
					</a>
				{/if}
			</div>
		</div>

		<!-- Description -->
		{#if hub.description}
			<p class="text-gray-700 mt-4">{hub.description}</p>
		{/if}

		<!-- Rest of the content -->
		<!-- Datas -->
		<div class="flex justify-end gap-4 mt-6">
			{#if hub.dates}
				<Modal
					open={openCalendarModal}
					onOpenChange={(e) => (openCalendarModal = e.open)}
					triggerBase="btn preset-tonal"
					contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
					backdropClasses="backdrop-blur-sm"
				>
					{#snippet trigger()}
						<h2 class="text-gray-800 flex items-center gap-2">
							<Icon icon="mdi:calendar-outline" width="24" height="24" />Calendar
						</h2>
					{/snippet}
					{#snippet content()}
						<header class="flex justify-between border-b pb-4 mb-6">
							<h2 class="text-2xl font-semibold text-gray-800">Important Dates</h2>
						</header>
						<article class="flex flex-col gap-6 text-gray-800 px-2">
							<div class="flex items-center gap-4 border-l-4 border-primary-500 pl-4">
								<Icon icon="mdi:calendar-start" class="text-primary-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Submission Start Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.submissionStart).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-yellow-500 pl-4">
								<Icon icon="mdi:calendar-end" class="text-yellow-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Submission Deadline</p>
									<p class="text-gray-600">
										{new Date(hub.dates.submissionEnd).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-green-500 pl-4">
								<Icon icon="mdi:calendar-start" class="text-green-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Event Start Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.eventStart).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>

							<div class="flex items-center gap-4 border-l-4 border-red-500 pl-4">
								<Icon icon="mdi:calendar-end" class="text-red-500" width="24" height="24" />
								<div>
									<p class="text-lg font-medium">Event End Date</p>
									<p class="text-gray-600">
										{new Date(hub.dates.eventEnd).toLocaleDateString('en-US', {
											month: 'long',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
							</div>
						</article>
					{/snippet}
				</Modal>
			{/if}

			<!-- Ações -->
			{#if hub.acknowledgement && hub.acknowledgement.replace(/<[^>]*>/g, '').trim()}
				<Modal
					open={openAcknowledgementModal}
					onOpenChange={(e) => (openAcknowledgementModal = e.open)}
					triggerBase="btn preset-tonal"
					contentBase="card bg-surface-100-900 p-4 space-y-4 shadow-xl max-w-screen-sm"
					backdropClasses="backdrop-blur-sm"
				>
					{#snippet trigger()}Acknowledgement{/snippet}
					{#snippet content()}
						<article>
							<div class="prose prose-sm text-gray-800 max-w-none">{@html hub.acknowledgement}</div>
						</article>
					{/snippet}
				</Modal>
			{/if}
		</div>

		<!-- Social Media Icons -->
		{#if hub.socialMedia}
			<div class="flex flex-wrap gap-3">
				{#if hub.socialMedia.website}
					<a
						href={hub.socialMedia.website}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:web" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.twitter}
					<a
						href={`https://twitter.com/${hub.socialMedia.twitter}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:twitter" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.facebook}
					<a
						href={`https://facebook.com/${hub.socialMedia.facebook}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-600"
					>
						<Icon icon="mdi:facebook" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.instagram}
					<a
						href={`https://instagram.com/${hub.socialMedia.instagram}`}
						target="_blank"
						class="text-gray-600 hover:text-pink-600"
					>
						<Icon icon="mdi:instagram" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.linkedin}
					<a
						href={`https://linkedin.com/in/${hub.socialMedia.linkedin}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-700"
					>
						<Icon icon="mdi:linkedin" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.youtube}
					<a
						href={`https://youtube.com/${hub.socialMedia.youtube}`}
						target="_blank"
						class="text-gray-600 hover:text-red-600"
					>
						<Icon icon="mdi:youtube" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.tiktok}
					<a
						href={`https://tiktok.com/@${hub.socialMedia.tiktok}`}
						target="_blank"
						class="text-gray-600 hover:text-black"
					>
						<Icon icon="simple-icons:tiktok" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.github}
					<a
						href={`https://github.com/${hub.socialMedia.github}`}
						target="_blank"
						class="text-gray-600 hover:text-gray-900"
					>
						<Icon icon="mdi:github" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.discord}
					<a
						href={hub.socialMedia.discord}
						target="_blank"
						class="text-gray-600 hover:text-indigo-600"
					>
						<Icon icon="mdi:discord" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.telegram}
					<a
						href={`https://t.me/${hub.socialMedia.telegram}`}
						target="_blank"
						class="text-gray-600 hover:text-blue-500"
					>
						<Icon icon="mdi:telegram" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.whatsapp}
					<a
						href={`https://wa.me/${hub.socialMedia.whatsapp}`}
						target="_blank"
						class="text-gray-600 hover:text-green-600"
					>
						<Icon icon="mdi:whatsapp" width="24" height="24" />
					</a>
				{/if}
				{#if hub.socialMedia.wechat}
					<a
						href="#asdasd"
						class="text-gray-600 hover:text-green-500"
						title={`WeChat ID: ${hub.socialMedia.wechat}`}
					>
						<Icon icon="mdi:wechat" width="24" height="24" />
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Hub Management Section -->
{#if isCreator}
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold text-gray-800">Hub Management</h2>

		<div class="flex gap-2">
			<!-- <ReviewerManagement reviewer={data.user} hubId={hub._id} {isCreator} /> -->
			<ReviewerManagement reviewer={data.user} hubId={hub._id} {isCreator} users={data.users} />
		</div>
	</div>
{/if}

<!-- Papers Section -->
<PapersSection papers={filteredPapers} {hub} {isCreator} userId={data.user.id} {shouldHighlight} />

<!-- Informações Gerais -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Informações Gerais</h2>
	<p><strong>Status:</strong> {hub.status}</p>
	<p><strong>Criado por:</strong> {hub.createdBy}</p>
</div> -->

<!-- Revisão e Visibilidade -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Revisão</h2>
	<p><strong>Revisão por:</strong> {hub.peerReview}</p>
	<p><strong>Convite para autores:</strong> {hub.authorInvite}</p>
	<p><strong>Visibilidade da identidade:</strong> {hub.identityVisibility}</p>
	<p><strong>Visibilidade da revisão:</strong> {hub.reviewVisibility}</p>
</div> -->

<!-- Licenças e Diretrizes -->
<!-- <div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
	<h2 class="text-xl font-semibold text-gray-800">Publicação</h2> -->

<!-- {#if hub.acknowledgement}
		<div class="mt-6 bg-white shadow rounded-xl p-4">
			<h2 class="text-xl font-semibold text-gray-800 mb-2">Agradecimentos e Regras</h2>
			<div class="prose prose-sm text-gray-800 max-w-none">{@html hub.acknowledgement}</div>
		</div>
	{/if} -->

<!-- {#if hub.licenses && hub.licenses.length > 0}
		<p><strong>Licenças:</strong> {hub.licenses.join(', ')}</p>
	{:else}
		<p><strong>Licenças:</strong> Nenhuma</p>
	{/if}
	{#if hub.extensions}
		<p><strong>Extensões:</strong> {hub.extensions}</p>
	{/if}
</div>
 -->

<!-- Outros Campos -->
<!-- {#if hub.tracks || hub.calendar}
	<div class="mt-6 bg-white shadow rounded-xl p-4 space-y-2">
		<h2 class="text-xl font-semibold text-gray-800">Outros</h2>
		{#if hub.tracks}
			<p><strong>Trilhas:</strong> {hub.tracks}</p>
		{/if}
		{#if hub.calendar}
			<p><strong>Calendário:</strong> {hub.calendar}</p>
		{/if}
		<p><strong>Mostrar calendário:</strong> {hub.showCalendar ? 'Sim' : 'Não'}</p>
	</div>
{/if} -->
