<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { getInitials } from '$lib/utils/GetInitials';

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

	const filteredPapers = data.papers?.filter((paper) => {
		if (paper.status === 'published') return true;

		const isMainAuthor = paper.mainAuthor?._id === userId;
		const isCoAuthor = paper.coAuthors?.some((ca) => ca._id === userId);
		const isCorresponding = paper.correspondingAuthor?._id === userId;
		const isSubmittedBy = paper.submittedBy?._id === userId;

		return isMainAuthor || isCoAuthor || isCorresponding || isSubmittedBy;
	});

	console.log('Papers after filtering:', filteredPapers);

	let openCalendarModal = $state(false);
	let openAcknowledgementModal = $state(false);

	function closeAllModals() {
		openCalendarModal = false;
		openAcknowledgementModal = false;
	}

	const isUserInvolved = (paper) => {
		const userId = data.user._id;
		return (
			paper.mainAuthor?._id === userId ||
			paper.coAuthors?.some((c) => c._id === userId) ||
			paper.correspondingAuthor?._id === userId ||
			paper.submittedBy?._id === userId
		);
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
		<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
			Sem Card
		</div>
	{/if}
</div>

<!-- Cabeçalho com logo -->
<div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
	<img
		src={hub.logoUrl ? `/api/images/${hub.logoUrl}` : '/placeholder-logo.jpg'}
		alt="Logo"
		class="w-28 h-28 object-contain rounded-full"
	/>
	<div class="flex-1 flex flex-col justify-between min-h-full">
		<!-- Top section with title and guidelines -->
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

			<!-- Guidelines moved to right -->
			{#if hub.guidelinesUrl}
				<a
					href={hub.guidelinesUrl}
					target="_blank"
					class="flex items-center gap-2 text-blue-600 hover:text-blue-700"
				>
					<Icon icon="mdi:file-document-outline" width="24" height="24" />
					<span class="underline">Diretrizes</span>
				</a>
			{/if}
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
			{#if hub.acknowledgement}
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
						href="#"
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

<!-- Papers Section -->
<section>
	<div class="mt-6 bg-white shadow-md rounded-xl p-6">
		<h2 class="text-xl font-semibold text-gray-800 mb-4">Artigos Submetidos</h2>

		{#if filteredPapers && filteredPapers.length > 0}
			<div class="space-y-4">
				{#each filteredPapers as paper}
					<div
						class="border rounded-lg p-4 transition-colors"
						class:bg-yellow-50={paper.status !== 'published' && isUserInvolved(paper)}
						class:border-yellow-300={paper.status !== 'published' && isUserInvolved(paper)}
					>
						{#if paper.status !== 'published' && isUserInvolved(paper)}
							<div
								class="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm font-medium"
							>
								 This article has <strong>not been published</strong> yet and is visible only to you
								and the authors involved.
							</div>
						{/if}
						<div class="flex justify-between items-start">
							<div>
								<h2 class="text-s font-semibold text-gray-800">
									{hub.type ? hub.type.toUpperCase() : ''} PAPER
								</h2>
								<a
									href={`/hub/view/${hub._id}`}
									class="text-xs text-blue-600 hover:text-blue-600 hover:underline"
								>
									{hub.title}
								</a>
								<h3 class="text-lg font-medium text-gray-900 mt-4">
									<a
										href={`/publish/published/${paper._id}`}
										class="hover:text-primary-600 transition-colors"
									>
										{paper.title}
									</a>
								</h3>
								<div class="text-sm text-gray-600 mt-1 flex items-center">
									<span class="mr-2">
										{new Date(paper.createdAt).toLocaleDateString()} |
									</span>
									<div class="flex items-center gap-2">
										<!-- Main Author -->
										{#if paper.mainAuthor}
											<div class="flex items-center gap-1">
												{#if paper.mainAuthor.profilePicture}
													<Avatar
														src={paper.mainAuthor.profilePicture}
														name={paper.mainAuthor.firstName}
														size="w-6"
													/>
												{:else}
													<div
														class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center"
													>
														<span class="text-xs font-bold text-gray-600">
															{getInitials(paper.mainAuthor.firstName, paper.mainAuthor.lastName)}
														</span>
													</div>
												{/if}
												<a
													href={`/profile/${paper.mainAuthor.username}`}
													class="text-blue-600 hover:text-blue-800 hover:underline"
												>
													{paper.mainAuthor.firstName + ' ' + paper.mainAuthor.lastName}
												</a>
											</div>
										{/if}

										<!-- Co-authors -->
										{#if paper.coAuthors && paper.coAuthors.length > 0}
											<!-- <span class="mx-1">,</span> -->
											<div class="flex items-center gap-1">
												{#each paper.coAuthors as coAuthor, i}
													<div class="flex items-center gap-1">
														{#if coAuthor.profilePicture}
															<Avatar
																src={coAuthor.profilePicture}
																name={coAuthor.firstName}
																size="w-6"
															/>
														{:else}
															<div
																class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center"
															>
																<span class="text-xs font-bold text-gray-600">
																	{getInitials(coAuthor.firstName, coAuthor.lastName)}
																</span>
															</div>
														{/if}
														<a
															href={`/profile/${coAuthor.username}`}
															class="text-blue-600 hover:text-blue-800 hover:underline"
														>
															{coAuthor.firstName + ' ' + coAuthor.lastName}
														</a>
														{#if i < paper.coAuthors.length - 1}
															<span class="mx-1">,</span>
														{/if}
													</div>
												{/each}
											</div>
										{/if}
									</div>
								</div>

								{#if paper.abstract}
									<p class="text-gray-700 mt-6 line-clamp-2">{@html paper.abstract}</p>
								{/if}
							</div>
						</div>
						<!-- Bottom section with keywords and actions -->
						<div class="flex justify-between items-end mt-4">
							<div>
								{#if paper.keywords?.length}
									<div class="flex gap-2 mt-2 flex-wrap">
										{#each paper.keywords as keyword}
											<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
												{keyword}
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Action buttons -->
							<div class="flex items-center gap-2">
								{#if paper.pdfId}
									<a
										href={`/api/papers/${paper._id}/download`}
										class="btn btn-sm variant-filled"
										target="_blank"
									>
										<Icon icon="mdi:file-pdf-box" width="20" height="20" />
										PDF
									</a>
								{/if}
								<a
									href={`/publish/published/${paper._id}`}
									class="btn btn-sm bg-primary-100-700 text-primary-700-100 hover:bg-primary-200-600 hover:text-primary-800-50 transition-colors duration-200 flex items-center gap-1"
								>
									Read More
									<Icon icon="mdi:arrow-right" width="20" height="20" />
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-600 text-center py-8">Nenhum artigo submetido ainda.</p>
		{/if}
	</div>
</section>

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
