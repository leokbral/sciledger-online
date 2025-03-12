<script lang="ts">
	// Imports
	import Icon from '@iconify/svelte';
	import ProfilePage from '$lib/Pages/Profile/ProfilePage.svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import type { KnowledgeArea } from '$lib/types/KnowledgeArea';
	import { knowledgeAreas, type SubArea } from '../../KnowledgeAreas';
	import type { Paper } from '$lib/types/Paper';
	import { getInitials } from '$lib/utils/GetInitials';
	import type { PageData } from './$types';
	import type { User } from '$lib/types/User';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Initialize state variables correctly
	let user = $state(data.user);
	let isEditing = $state(false);
	let editedBio = $state('');
	let editedPosition = $state('');
	let editedInstitution = $state('');
	let profilePictureUrl = $state('');
	let publications = $state<Paper[]>([]);
	let interestAreas = $state<string[]>([]);
	let contactInfo = $state('');

	let expertise = $state<string[]>([]); //user?.performanceReviews?.expertise || [];
	// let areaToShow = $derived(() =>
	// 	expertise.map((areaId) => knowledgeAreas.find((area) => area.id === areaId)).filter(Boolean)
	// );
	let areaToShow = $derived<SubArea[]>(
		expertise
			.map((areaId) => knowledgeAreas.find((area) => area.id === areaId))
			.filter((area): area is SubArea => area !== undefined)
	);

	// expertise
	// 	.map((areaId) => knowledgeAreas.find((area) => area.id === areaId))
	// 	.filter(Boolean);

	let userAdditionalInfo = $state({}); //user?.performanceReviews || {};

	// Update edited values when user changes
	$effect(() => {
		editedBio = user?.bio || '';
		editedPosition = user?.position || '';
		editedInstitution = user?.institution || '';

		if (user) {
			publications = user.papers.filter((paper) => paper.status === 'published') || [];
			interestAreas = user.performanceReviews?.expertise || [];
			contactInfo = user.email || '';
			profilePictureUrl = user.profilePictureUrl || '';
			// expertise = user.performanceReviews?.expertise || [];
			if (user?.performanceReviews?.expertise) {
				expertise = user.performanceReviews.expertise;
			}
		}
		// tabsContent = [publications, interestAreas, contactInfo];
	});

	let maxBioLength = 1000;

	let imageSize = 100;
	let imagePositionX = 0;
	let imagePositionY = 0;

	// Tabs configuration
	let tabs = [
		{ name: 'Publications', icon: 'material-symbols-light:draft-outline-rounded' },
		{ name: 'Interest Areas', icon: 'material-symbols-light:star-outline' },
		{ name: 'Contact Info', icon: 'material-symbols-light:contact-mail-outline' }
	];

	let tabsContent = $derived([publications, interestAreas, contactInfo]);
	let tabsData = $derived({
		tabs,
		tabsContent
	});

	// let tabsData = {
	// 	tabs,
	// 	tabsContent
	// };

	// Functions
	async function toggleEdit() {
		isEditing = !isEditing;
		if (!isEditing) {
			// Reset edited values if cancelled
			editedBio = user?.bio || '';
			editedPosition = user?.position || '';
			editedInstitution = user?.institution || '';
		}
	}

	async function saveProfile() {
		if (isEditing) {
			// Validation
			if (!editedPosition || !editedInstitution) {
				alert('Forneça sua posição e instituição.');
				return;
			}

			// Save logic here, make an API call to save changes
			try {
				const response = await fetch('/profile/${user.username}', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						id: user?.id,
						position: editedPosition,
						institution: editedInstitution,
						bio: editedBio
					})
				});

				if (response.ok) {
					// Assuming the updated user is returned in the response
					const updatedUser = await response.json();
					user = updatedUser.user; // Update local user state with the response data
					isEditing = false; // Exit edit mode
				} else {
					// Handle errors
					const errorData = await response.json();
					console.error('Erro ao salvar perfil:', errorData.error);
					alert('Erro ao salvar perfil. Por favor, tente novamente.');
				}
			} catch (error) {
				console.error('Erro ao salvar perfil:', error);
				alert('Erro interno do servidor. Por favor, tente novamente.');
			}
		}
	}

	async function handleProfilePictureChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			// Handle file upload logic here
			console.log('Selected file:', file);
		}
	}
</script>

<!-- Profile Section -->
<section class="flex items-center justify-center min-h-screen bg-gray-100">
	<div class="p-6 mx-32 bg-white rounded-sm shadow-lg max-w-3xl w-full">
		<!-- Edit Button -->
		<div class="mt-4 flex justify-end">
			{#if isEditing}
				<button class="bg-red-500 text-white p-2 rounded-full mr-2" onclick={toggleEdit}>
					Cancel
				</button>
				<button class="bg-green-500 text-white p-2 rounded-full" onclick={saveProfile}>
					Save
				</button>
			{:else if user?.id === data.loggedUser.id}
				<button
					class="bg-blue-500 text-white p-2 rounded-full flex items-center"
					onclick={toggleEdit}
				>
					Edit profile
				</button>
			{/if}
		</div>

		<!-- Profile Picture and Info -->
		<div class="flex items-center gap-4 mt-6">
			<div class="relative w-36 h-36 mr-4">
				{#if user?.profilePictureUrl}
					<div class="relative group cursor-pointer w-32 h-32">
						<Avatar src={user.profilePictureUrl} name={user.firstName} size="w-32" />
						{#if isEditing}
							<label
								for="profilePicture"
								class="absolute bottom-0 left-0 right-0 h-1/3
								flex items-center justify-center
								bg-black bg-opacity-50
								opacity-0 group-hover:opacity-100
								transition-opacity rounded-b-full"
							>
								<Icon icon="material-symbols:camera-outline" class="text-white text-2xl" />
							</label>
							<input
								type="file"
								id="profilePicture"
								accept="image/*"
								class="hidden"
								onchange={handleProfilePictureChange}
							/>
						{/if}
					</div>
				{:else if user?.firstName && user?.lastName}
					<div class="relative group cursor-pointer w-32 h-32">
						<div
							class="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 rounded-full"
						>
							<span class="text-5xl font-bold">{getInitials(user.firstName, user.lastName)}</span>
						</div>
						{#if isEditing}
							<label
								for="profilePicture"
								class="absolute bottom-0 left-0 right-0 h-1/3
								flex items-center justify-center
								bg-black bg-opacity-50
								opacity-0 group-hover:opacity-100
								transition-opacity rounded-b-full"
							>
								<Icon icon="material-symbols:camera-outline" class="text-white text-2xl" />
							</label>
							<input
								type="file"
								id="profilePicture"
								accept="image/*"
								class="hidden"
								onchange={handleProfilePictureChange}
							/>
						{/if}
					</div>
				{:else}
					<div class="relative group cursor-pointer w-32 h-32">
						<div
							class="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 rounded-full"
						>
							<Icon icon="material-symbols:person" class="text-4xl" />
						</div>
						{#if isEditing}
							<label
								for="profilePicture"
								class="absolute top-[75%] left-0 right-0 bottom-0 flex items-center justify-center
						bg-black bg-opacity-50 opacity-0 group-hover:opacity-100
						transition-opacity rounded-b-full"
							>
								<Icon icon="material-symbols:camera-outline" class="text-white text-2xl" />
							</label>
							<input
								type="file"
								id="profilePicture"
								accept="image/*"
								class="hidden"
								onchange={handleProfilePictureChange}
							/>
						{/if}
					</div>
				{/if}
			</div>

			<div>
				<div class="text-2xl font-bold">{user?.firstName} {user?.lastName}</div>
				<div class="text-base font-semibold">{user?.username}</div>
				<div class="text-xl mt-4">
					{#if isEditing}
						<input
							type="text"
							bind:value={editedPosition}
							class="mt-2 p-2 text-gray-900 border rounded-sm w-full"
						/>
						<input
							type="text"
							bind:value={editedInstitution}
							class="mt-2 p-2 text-gray-900 border rounded-sm w-full"
						/>
					{:else}
						{user?.position || 'No position'} at {user?.institution || 'No institution'}
					{/if}
				</div>
			</div>
		</div>

		<!-- Following and Followers Section -->
		<div class="flex gap-4 mt-6">
			<div class="flex gap-2">
				<p class="mt-0"><strong>{user?.following.length || 0}</strong></p>
				<div>Following</div>
			</div>
			<div class="flex gap-2">
				<p class="mt-0"><strong>{user?.followers.length || 0}</strong></p>
				<div>Followers</div>
			</div>
		</div>

		<!-- Performance Reviews and Metrics -->
		<div class="mt-6">
			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:kid-star-outline-sharp" />
				<div class="font-bold">Performance Reviews:</div>
				{#if user?.performanceReviews?.recommendations}
					<div class="mt-0 flex items-center">
						<a href="s" class="text-blue-500"
							>{user.performanceReviews.recommendations.join(', ') || 'No reviews'}</a
						>
					</div>
				{:else}
					<div class="font-normal mt-0">No reviews</div>
				{/if}
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:rate-review-outline" />
				<div class="font-bold">Average Review (days):</div>
				<div class="font-normal mt-0">{user?.performanceReviews?.averageReviewDays || 'N/A'}</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-6" icon="material-symbols-light:person-check-outline" />
				<div class="font-bold">Recommendations:</div>
				<div class="mt-0">
					<a href="s" class="text-blue-500"
						>{user?.performanceReviews?.recommendations?.join(', ') || 'No recommendations'}</a
					>
				</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:mark-unread-chat-alt-outline" />
				<div class="font-bold">Response Time:</div>
				<div class="font-normal mt-0">{user?.performanceReviews?.responseTime || 'N/A'} hours</div>
			</div>

			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="mdi:brain" />
				<div class="font-bold">Expertise:</div>
				{#if areaToShow.length > 0}
					<div class="font-normal mt-0">
						{areaToShow.map((area: SubArea) => area?.name).join(', ') || 'No expertise listed'}
					</div>
				{:else}
					<div class="font-normal">No expertise listed</div>
				{/if}
			</div>
			<div class="flex gap-2 items-center">
				<Icon class="size-5" icon="material-symbols-light:contact-mail-outline" />
				<div class="font-bold">Contact Info:</div>
				<div class="font-normal mt-0">{contactInfo || 'No contact info'}</div>
			</div>
		</div>

		<!-- About Section -->
		<div class="mt-6">
			<h2 class="text-xl font-semibold">About</h2>
			{#if isEditing}
				<textarea
					class="mt-2 p-2 text-gray-900 border rounded-sm w-full h-48"
					bind:value={editedBio}
					maxlength={maxBioLength}
				></textarea>
				<p class="text-xs">{editedBio?.length} / {maxBioLength} characters</p>
			{:else}
				<p class="mt-2">{user?.bio || 'No bio available'}</p>
			{/if}
		</div>

		<!-- Profile Page Component -->
		<div class="mt-6">
			<ProfilePage data={tabsData}></ProfilePage>
		</div>
	</div>
</section>
