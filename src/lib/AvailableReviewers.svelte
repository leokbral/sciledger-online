<script lang="ts">
	import type { User } from '$lib/types/User';
	import Icon from '@iconify/svelte'; // Make sure to import Icon component if you're using icons

	interface Props {
		reviewers?: User[];
		selectedReviewers?: string[];
		toggleReviewerSelection: (reviewerId: string) => void;
	}

	let { reviewers = [], selectedReviewers = [], toggleReviewerSelection }: Props = $props();
	let imageSize = 100;
	let imagePositionX = 0;
	let imagePositionY = 0;
	let averageReview: number = 10;
	let userAditionalInfo = {
		responseTime: '' // Default value, you can adjust as needed
	};
</script>

<section class="mt-4">
	{#each reviewers as reviewer}
		<div class="pt-0 bg-surface-100-50-token">
			<div class="p-4 shadow-sm rounded-sm mb-6">
				<!-- Seleção de Reviewer -->
				<div class="flex justify-end items-center">
					<input
						type="checkbox"
						id={reviewer.id}
						checked={selectedReviewers.includes(reviewer.id)}
						onchange={() => toggleReviewerSelection(reviewer.id)}
					/>
					<label for={reviewer.id} class="ml-2"></label>
				</div>

				<div class="flex gap-4">
					<!-- Foto de Perfil -->
					<div class="relative w-32 h-32 mr-4">
						<img
							src={reviewer.profilePictureUrl}
							alt="Profile"
							class="rounded-full absolute"
							style="width: {imageSize}%; height: {imageSize}%; object-fit: cover; left: {imagePositionX}%; top: {imagePositionY}%;"
						/>
					</div>

					<!-- Informações Pessoais e Profissionais -->
					<div class="flex-1">
						<div class="flex text-xl font-bold">
							{reviewer.firstName} {reviewer.lastName}
							<Icon class="text-primary-500 size-6" icon="bitcoin-icons:verify-filled" />
						</div>
						<div class="flex text-base font-semi-bold">{reviewer.username}</div>
						<div class="text-lg mt-4">
							{reviewer.position} at {reviewer.institution}
						</div>

						<!-- <div class="grid grid-cols-2 gap-4 mt-4">
							< !-- Performance Reviews -- >
							<div class="flex gap-2 items-center">
								<Icon class="size-5" icon="material-symbols-light:kid-star-outline-sharp" />
								<div class="font-bold">Performance Reviews:</div>
								<div class="mt-0 flex items-center">
									<a href="#asd" class="text-primary-500">{reviewer.performanceReviews?.averageReviewDays}</a>
								</div>
							</div>

							< !-- Average Review -- >
							<div class="flex gap-2 items-center">
								<Icon class="size-5" icon="material-symbols-light:rate-review-outline" />
								<div class="font-bold">Average Review (days):</div>
								<div class="font-normal mt-0">{reviewer.performanceReviews?.averageReviewDays}</div>
							</div>

							< !-- Response Time -- >
							<div class="flex gap-2 items-center">
								<Icon class="size-5" icon="material-symbols-light:mark-unread-chat-alt-outline" />
								<div class="font-bold">Response Time:</div>
								<div class="font-normal mt-0">{reviewer.performanceReviews?.responseTime}</div>
							</div>

							< !-- Knowledge Area -- >
							<div class="flex gap-2 items-start">
								<div class="font-bold flex gap-2">
									<Icon class="size-5" icon="mdi:brain" />Expertise:
								</div>
								<div class="font-normal mt-0">{reviewer.performanceReviews?.expertise} ??????????Area not found</div>
							</div>

							< !-- Recommendations -- >
							<div class="flex gap-2 items-center">
								<Icon class="size-6" icon="material-symbols-light:person-check-outline" />
								<div class="font-bold">Recommendations:</div>
								<div class="mt-0"><a href="#asd" class="text-primary-500">{reviewer.performanceReviews?.recommendations}</a></div>
							</div> -->
						<!-- </div> -->
					</div>
				</div>
			</div>
		</div>
	{/each}
</section>
