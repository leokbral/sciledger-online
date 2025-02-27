<script lang="ts">
	import { userProfiles } from '../../UserProfile';
	import Icon from '@iconify/svelte';
	import { knowledgeAreas } from '../../KnowledgeAreas';
	import type { KnowledgeArea } from '$lib/types/KnowledgeArea';

	let averageReview: number = 10;
	let tabSet: number = 0;
	let maxBioLength = 1000;
	let user = userProfiles[3];
	let isEditing = false;
	let editedBio = user.bio;
	let editedTitle = user.title;
	let editedInstitution = user.institution;
	let profilePicture = user.profilePicture;
	let imageSize = 100; // Tamanho inicial da imagem em pixels
	let imagePositionX = 0;
	let imagePositionY = 0;
	let selectedReviewers: string[] = [];
	
	let tabs = [
		{
			name: 'Publications',
			icon: 'material-symbols-light:draft-outline-rounded'
		},
		{
			name: 'Interest Areas',
			icon: 'hugeicons:conversation'
		},
		{
			name: 'Contact Info',
			icon: 'material-symbols-light:rate-review-outline-rounded'
		}
	];

	// Função para obter o nome da área por ID
	function getAreaNameById(id: string): string {
		const area = knowledgeAreas.find((area) => area.id === id);
		return area ? area.name : 'Area not found';
	}
	const areaIdToShow = '1.3'; // Defina o ID da área que você quer mostrar

	// Encontre a área específica com base no ID
	const areaToShow: KnowledgeArea | undefined = knowledgeAreas.find(
		(area) => area.id === areaIdToShow
	);
	const userAditionalInfo = {
		performanceReviews: [
			{
				reviewer: 'Jane Smith',
				rating: 4.5,
				comments: 'Excellent reviewer, very detailed feedback.'
			},
			{
				reviewer: 'Michael Johnson',
				rating: 3.8,
				comments: 'Good reviewer, could improve in timely responses.'
			}
		],
		peerRecommendations: [
			{
				recommender: 'Alice Brown',
				affiliation: 'University of Technology',
				comment: 'Highly recommended for expertise in AI.'
			},
			{
				recommender: 'David White',
				affiliation: 'Research Institute',
				comment: 'Excellent researcher with deep knowledge in data science.'
			}
		],
		responseTime: '2 days' // Exemplo de tempo médio de resposta
	};

	function toggleReviewerSelection(userId: string) {
		if (selectedReviewers.includes(userId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== userId);
		} else {
			selectedReviewers.push(userId);
		}
	}
	// function toggleEdit() {
	// 	isEditing = !isEditing;
	// 	if (!isEditing) {
	// 		// Reset edited values if cancelled
	// 		editedBio = user.bio;
	// 		editedTitle = user.title;
	// 		editedInstitution = user.institution;
	// 	}
	// }

	// function saveProfile() {
	// 	user.bio = editedBio;
	// 	user.title = editedTitle;
	// 	user.institution = editedInstitution;
	// 	user.profilePicture = profilePicture;
	// 	isEditing = false;
	// }

	// function handleFileUpload(event: Event) {
	// 	const target = event.target as HTMLInputElement;
	// 	const files = target.files;
	// 	if (files && files.length > 0) {
	// 		const reader = new FileReader();
	// 		reader.onload = () => {
	// 			profilePicture = reader.result as string;
	// 		};
	// 		reader.readAsDataURL(files[0]);
	// 	}
	// }
</script>

<section class="mt-4">
	{#each userProfiles as user}
		<div class="pt-0 mx-32 bg-surface-100-50-token">
			<!-- container page max-w-[700px] p-4 m-auto -->
			<div class="p-4 shadow rounded mb-6">
				<!-- Seleção de Reviewer -->
				<div class="flex justify-end items-center">
					<input
						type="checkbox"
						id={user.id}
						checked={selectedReviewers.includes(user.id)}
						on:change={() => toggleReviewerSelection(user.id)}
					/>
					<!-- <label for={user.id} class="ml-2">Select for review</label> -->
					<label for={user.id} class="ml-2"></label>
				</div>

				<div class="flex gap-4">
					<!-- Foto de Perfil -->
					<div class="relative w-32 h-32 mr-4">
						<img
							src={user.profilePicture}
							alt="Profile"
							class="rounded-full absolute"
							style="width: {imageSize}%; height: {imageSize}%; object-fit: cover; left: {imagePositionX}%; top: {imagePositionY}%;"
						/>
					</div>

					<!-- Informações Pessoais e Profissionais -->
					<div class="flex-1">
						<div class="flex text-xl font-bold">
							{user.name}<Icon class="text-primary-500 size-6" icon="bitcoin-icons:verify-filled" />
						</div>
						<div class="flex text-base font-semi-bold">@{user.id}</div>
						<div class="text-lg mt-4">
							{#if isEditing}
								<input
									type="text"
									bind:value={editedTitle}
									class="mt-2 p-2 text-surface-900 border rounded w-full"
								/>
								<input
									type="text"
									bind:value={editedInstitution}
									class="mt-2 p-2 text-surface-900 border rounded w-full"
								/>
							{:else}
								{user.title} at {user.institution}
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4 flex-1">
						<!-- Performance Reviews -->
						<div class="flex gap-2 items-center">
							<Icon class="size-5" icon="material-symbols-light:kid-star-outline-sharp" />
							<div class="font-bold">Performance Reviews:</div>
							<div class="mt-0 flex items-center">
								<a href="d" class="text-primary-500">4.5/5</a>
							</div>
						</div>

						<!-- Métricas de Desempenho -->
						<div class="flex gap-2 items-center">
							<Icon class="size-5" icon="material-symbols-light:rate-review-outline" />
							<div class="font-bold">Average Review (days):</div>
							<div class="font-normal mt-0">{averageReview}</div>
						</div>

						<!-- Seção de Tempo Médio de Resposta -->
						<div class="flex gap-2 items-center">
							<Icon class="size-5" icon="material-symbols-light:mark-unread-chat-alt-outline" />
							<div class="font-bold">Response Time:</div>
							<div class="font-normal mt-0">{userAditionalInfo.responseTime}</div>
						</div>

						<!-- Knowledge Area -->
						<div class="flex gap-2 items-start">
							<div class="font-bold flex gap-2">
								<Icon class="size-5" icon="mdi:brain" />Expertise<!-- Knowledge Area -->:
							</div>
							{#if areaToShow}
								<div class="font-normal mt-0">{areaToShow.name}</div>
							{:else}
								<div class="font-normal">Area not found</div>
							{/if}
						</div>

						<!-- Peer Recommendations -->
						<div class="flex gap-2 items-center">
							<Icon class="size-6" icon="material-symbols-light:person-check-outline" />
							<div class="font-bold">Recommendations:</div>
							<div class="mt-0"><a href="d" class="text-primary-500">17</a></div>
						</div>

						<!-- Seleção de Reviewer -->
						<!-- <div class="flex justify-center items-center">
							<input
								type="checkbox"
								id={user.id}
								checked={selectedReviewers.includes(user.id)}
								on:change={() => toggleReviewerSelection(user.id)}
							/>
							<label for={user.id} class="ml-2">Select for review</label>
						</div> -->
					</div>
				</div>
			</div>
		</div>
	{/each}
</section>

<!-- <div>
					<div class="font-bold">Performance Reviews</div>
					{#if userAditionalInfo.performanceReviews && userAditionalInfo.performanceReviews.length > 0}
						<ul class="list-disc ml-4">
							{#each userAditionalInfo.performanceReviews as review}
								<li>
									<div class="font-semibold">{review.reviewer}</div>
									<div class="text-sm text-gray-600">{review.comments}</div>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="text-gray-500">No performance reviews available.</div>
					{/if}
				</div> -->

<!-- Seção de Recomendações de Pares -->
<!-- <div>
					<div class="font-bold">Peer Recommendations</div>
					{#if userAditionalInfo.peerRecommendations && userAditionalInfo.peerRecommendations.length > 0}
						<ul class="list-disc ml-4">
							{#each userAditionalInfo.peerRecommendations as recommendation}
								<li>
									<div class="font-semibold">{recommendation.recommender}</div>
									<div class="text-sm text-gray-600">{recommendation.comment}</div>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="text-gray-500">No peer recommendations available.</div>
					{/if}
				</div> -->
