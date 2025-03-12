<script lang="ts">
	// Imports
	import Icon from '@iconify/svelte';
	import ProfilePage from '$lib/Pages/Profile/ProfilePage.svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	//import { scientificArticles } from '../../ScientificArticles';
	import type { KnowledgeArea } from '$lib/types/KnowledgeArea';
	import { knowledgeAreas } from '../../KnowledgeAreas';
	import type { Paper } from '$lib/types/Paper';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	let user = data.user; //userProfiles[1];
	let averageReview: number = 10;
	let selectedReviewers: string[] = [];
	let tabSet: number = 0;
	let maxBioLength = 1000;
	let isEditing = $state(false);
	let editedBio = $state(user?.bio);
	let editedTitle = $state(user?.title);
	let editedInstitution = $state(user?.institution);
	let profilePictureUrl = user?.profilePictureUrl;
	let imageSize = 100;
	let imagePositionX = 0;
	let imagePositionY = 0;

	// Tabs configuration
	let tabs = [
		{ name: 'Publications', icon: 'material-symbols-light:draft-outline-rounded' }
		// { name: 'Interest Areas', icon: 'hugeicons:conversation' },
		// { name: 'Contact Info', icon: 'material-symbols-light:rate-review-outline-rounded' }
	];

	let publications: Paper[] = [] //scientificArticles;
	let interestAreas: string[] = [] //user?.interestAreas || ;
	let contactInfo = user?.email;

	let tabsContent = [publications, interestAreas, contactInfo];

	let tabsData = {
		tabs,
		tabsContent
	};

	const areaIdToShow = '1.3'; // Define the ID of the area you want to show
	const areaToShow: KnowledgeArea | undefined = knowledgeAreas.find(
		(area) => area.id === areaIdToShow
	);

	const userAdditionalInfo = {
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
		responseTime: '2 days'
	};

	// Functions
	function toggleEdit() {
		isEditing = !isEditing;
		if (!isEditing) {
			// Reset edited values if cancelled
			editedBio = user?.bio;
			editedTitle = user?.title;
			editedInstitution = user?.institution;
		}
	}

	function saveProfile() {
		// 	user?.bio = editedBio;
		// 	user?.title = editedTitle;
		// 	user?.institution = editedInstitution;
		isEditing = false;
	}
</script>

<!-- Profile Section -->
<section class="flex items-center justify-center min-h-screen">
	<div class="p-6 mx-32 bg-surface-100-50-token rounded shadow-lg max-w-3xl w-full">
		<!-- Edit Button -->
		<div class="mt-4 flex justify-end">
			{#if isEditing}
				<button class="bg-surface-500 text-white p-2 rounded-full mr-2" onclick={toggleEdit}>
					Cancel
				</button>
				<button class="bg-primary-500 text-white p-2 rounded-full" onclick={saveProfile}>
					Save
				</button>
			{:else}
				<button
					class="bg-primary-500 text-white p-2 rounded-full flex items-center"
					onclick={toggleEdit}
				>
					Edit profile
				</button>
			{/if}
		</div>

		<!-- Profile Picture and Info -->
		<div class="flex items-center gap-4 mt-6">
			<div class="relative w-36 h-36 mr-4">
				<!-- <img
					src={
profilePictureUrl}
					alt="Profile"
					class="rounded-full absolute"
					style="width: {imageSize}%; height: {imageSize}%; object-fit: cover; left: {imagePositionX}%; top: {imagePositionY}%;"
				/> -->
				<Avatar src={profilePictureUrl} width="w-32" />
			</div>

			<div>
				<div class="text-2xl font-bold">{user?.firstName}</div>
				<div class="text-base font-semi-bold">@{user?.id}</div>
				<div class="text-xl mt-4">
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
						{user?.title} at {user?.institution}
					{/if}
				</div>
			</div>
		</div>

		<!-- Following and Followers Section -->
		<div class="flex gap-4 mt-6">
			<div class="flex gap-2">
				<p class="mt-0"><strong>150</strong></p>
				<div>Following</div>
			</div>
			<div class="flex gap-2">
				<p class="mt-0"><strong>1024</strong></p>
				<div>Followers</div>
			</div>
		</div>

		<!-- Performance Reviews and Metrics -->
		<div class="mt-6">
			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:kid-star-outline-sharp" />
				<div class="font-bold">Performance Reviews:</div>
				<div class="mt-0 flex items-center">
					<a href="s" class="text-primary-500">4.5/5</a>
				</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:rate-review-outline" />
				<div class="font-bold">Average Review (days):</div>
				<div class="font-normal mt-0">{averageReview}</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-6" icon="material-symbols-light:person-check-outline" />
				<div class="font-bold">Recommendations:</div>
				<div class="mt-0"><a href="s" class="text-primary-500">17</a></div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:mark-unread-chat-alt-outline" />
				<div class="font-bold">Response Time:</div>
				<div class="font-normal mt-0">{userAdditionalInfo.responseTime}</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="mdi:brain" />
				<div class="font-bold">Expertise:</div>
				{#if areaToShow}
					<div class="font-normal mt-0">{areaToShow.name}</div>
				{:else}
					<div class="font-normal">Area not found</div>
				{/if}
			</div>
			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:contact-mail-outline" />
				<div class="font-bold">Contact Info:</div>
				<div class="font-normal mt-0">{contactInfo}</div>
			</div>
		</div>

		<!-- About Section -->
		<div class="mt-6">
			<h2 class="text-xl font-semibold">About</h2>
			{#if isEditing}
				<textarea
					class="mt-2 p-2 text-surface-900 border rounded w-full h-48"
					bind:value={editedBio}
					maxlength={maxBioLength}
				></textarea>
				<p class="text-xs">{editedBio?.length} / {maxBioLength} characters</p>
			{:else}
				<p class="mt-2">{user?.bio}</p>
			{/if}
		</div>

		<!-- Profile Page Component -->
		<div class="mt-6">
			<ProfilePage data={tabsData}></ProfilePage>
		</div>
	</div>
</section>
