<script lang="ts">
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils/index.js';
	import type { Paper } from '$lib/types/Paper';
	import type { PageData } from './$types';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	import { page } from '$app/stores';
	import AvailableReviewers from '$lib/AvailableReviewers.svelte';
	import type { User } from '$lib/types/User';
	import PapersImages from '$lib/components/PapersImages.svelte';
	import Icon from '@iconify/svelte';
	import { FileUpload } from '@skeletonlabs/skeleton-svelte';
	import type { Hub } from '$lib/types/Hub';
	import ReviewerModal from '$lib/components/ReviewerModal/ReviewerModal.svelte';
	import PaperReviewerInvite from '$lib/components/PaperReviewerInvite/PaperReviewerInvite.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let reviewers = data.users.filter((u: User) => u.roles.reviewer === true);
	let peer_review: string = $state('');
	let paper: Paper | null = $state(data.paper);

	interface ImageItem {
		id?: string;
		file?: File;
		previewUrl: string;
	}

	let imageItems: ImageItem[] = $state([]);
	let isLinkedToHub: boolean = $state(false);
	let selectedReviewers: string[] = $state([]);
	let availableHubs: Hub[] = $state([]);
	let isLoadingHubs: boolean = $state(false);
	let selectedHub: string | null = $state(null);

	$effect(() => {
		if (paper?.paperPictures) {
			imageItems = paper.paperPictures.map((id) => ({
				id,
				previewUrl: `/api/images/${id}`
			}));
		}
	});

	async function handleImageUpload(event: any) {
		const file = event.acceptedFiles[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			imageItems = [...imageItems, { file, previewUrl: e.target?.result as string }];
		};
		reader.readAsDataURL(file);
	}

	async function toggleReviewerSelection(reviewerId: string) {
		try {
			if (selectedReviewers.includes(reviewerId)) {
				// Remove reviewer
				selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);

				// Call API to unassign reviewer
				const response = await post(`/api/review/unassign`, {
					paperId: paper?.id,
					reviewerId: reviewerId
				});

				if (!response.success) {
					console.error('Failed to unassign reviewer:', response.message);
					// Revert the UI change if API call failed
					selectedReviewers = [...selectedReviewers, reviewerId];
					alert('Failed to unassign reviewer. Please try again.');
				}
			} else {
				// Add reviewer
				selectedReviewers = [...selectedReviewers, reviewerId];

				// Call API to assign reviewer
				const response = await post(`/api/review/assign`, {
					paperId: paper?.id,
					reviewerId: reviewerId,
					peerReviewType: peer_review || 'selected'
				});

				if (!response.success) {
					console.error('Failed to assign reviewer:', response.message);
					// Revert the UI change if API call failed
					selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
					alert('Failed to assign reviewer. Please try again.');
				} else {
					// Show success message
					const reviewer = reviewers.find((r) => r.id === reviewerId);
					alert(
						`Reviewer ${reviewer?.firstName} ${reviewer?.lastName} has been assigned successfully!`
					);
				}
			}
		} catch (error) {
			console.error('Error toggling reviewer selection:', error);
			alert('An error occurred. Please try again.');
		}
	}

	async function handleSavePaper(event: MouseEvent) {
		if (!paper) return;

		try {
			// Check if at least 3 reviewers have accepted
			const acceptedReviewers = paper.peer_review?.responses?.filter(
				response => response.status === 'accepted'
			) || [];

			if (acceptedReviewers.length < 3) {
				alert(`You need at least 3 reviewers to accept before submitting to review. Currently ${acceptedReviewers.length} reviewer(s) have accepted.`);
				return;
			}

			// Upload pending images
			const newImageIds = await Promise.all(
				imageItems
					.filter((item) => item.file)
					.map(async (item) => {
						const formData = new FormData();
						formData.append('file', item.file!);
						const response = await fetch('/api/images/upload', {
							method: 'POST',
							body: formData
						});
						const data = await response.json();
						return data.id;
					})
			);

			const existingImageIds = imageItems.filter((item) => item.id).map((item) => item.id!);
			const allImageIds = [...existingImageIds, ...newImageIds];

			const updatedPaper = {
				...paper,
				selectedReviewers,
				peerReviewType: peer_review,
				status: 'in review',
				paperPictures: allImageIds
			};

			const response = await post(`/publish/negotiation/${updatedPaper.id}`, updatedPaper);

			if (response.paper) {
				const [poolResponse, reviewAssignments] = await Promise.all([
					post(`/api/paperspool/${updatedPaper.id}/update-price`, {
						price: updatedPaper.price
					}),
					post(`/api/review/assign`, {
						paperId: updatedPaper.id,
						reviewerIds: selectedReviewers,
						peerReviewType: peer_review
					})
				]);

				if (poolResponse.success && reviewAssignments.success) {
					goto(`/publish/`);
				} else {
					alert('Failed to update price or assign reviewers');
				}
			} else {
				alert(`Issue: ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.error(error);
			alert('An error occurred. Please try again.');
		}
	}

	async function hdlSaveDraft(event: MouseEvent) {
		if (!paper) return;

		try {
			const newImageIds = await Promise.all(
				imageItems
					.filter((item) => item.file)
					.map(async (item) => {
						const formData = new FormData();
						formData.append('file', item.file!);
						const response = await fetch('/api/images/upload', {
							method: 'POST',
							body: formData
						});
						const data = await response.json();
						return data.id;
					})
			);

			const existingImageIds = imageItems.filter((item) => item.id).map((item) => item.id!);
			const allImageIds = [...existingImageIds, ...newImageIds];

			const draftPaper = {
				...paper,
				selectedReviewers,
				peerReviewType: peer_review,
				status: 'under negotiation',
				paperPictures: allImageIds
			};

			const response = await post(`/publish/negotiation/${draftPaper.id}`, draftPaper);

			if (response.paper) {
				alert('Draft saved successfully');
				paper = response.paper;
				imageItems = allImageIds.map((id) => ({
					id,
					previewUrl: `/api/images/${id}`
				}));
			} else {
				alert(`Failed to save draft: ${JSON.stringify(response)}`);
			}
		} catch (error) {
			console.error('Error saving draft:', error);
			alert('Failed to save draft. Please try again.');
		}
	}

	async function deleteImage(imageId: string) {
		try {
			const response = await fetch(`/publish/negotiation/${paper?.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ imageId })
			});

			const data = await response.json();
			if (data.success) {
				paper = data.paper;
			} else {
				alert('Failed to delete image');
			}
		} catch (error) {
			console.error('Error deleting image:', error);
			alert('Failed to delete image');
		}
	}

	async function loadHubs() {
		isLoadingHubs = true;
		try {
			// Change from '/hubs' to the current route which has the GET handler
			const response = await fetch(`/publish/negotiation/${paper?.id}`);
			const data = await response.json();

			if (data.success) {
				availableHubs = data.hubs
					.filter((hub: { status: string }) => hub.status === 'open')
					.sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));
			} else {
				console.error('Failed to load hubs:', data.message);
			}
		} catch (error) {
			console.error('Error loading hubs:', error);
		} finally {
			isLoadingHubs = false;
		}
	}
	$effect(() => {
		if (isLinkedToHub) {
			loadHubs();
		}
	});

	async function confirmHubSelection() {
		try {
			if (!paper || !selectedHub) return;

			const updatedPaper = {
				...paper,
				hubId: selectedHub,
				isLinkedToHub: true
			};

			const response = await post(`/publish/negotiation/${paper.id}`, updatedPaper);

			if (response.paper) {
				alert('Hub linked successfully!');
				paper = response.paper;
			} else {
				alert('Failed to link hub.');
			}
		} catch (error) {
			console.error('Error confirming hub selection:', error);
			alert('An error occurred while linking the hub.');
		}
	}
</script>

<!-- UI HTML -->
<div class="grid grid-cols-[1fr_1fr_1fr] p-5">
	<div></div>
	<div class="flex justify-between gap-3">
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}>
			Save Draft
		</button>
		<button 
			class="bg-primary-500 text-white rounded-lg px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed" 
			onclick={handleSavePaper}
			disabled={!paper?.peer_review?.responses || paper.peer_review.responses.filter(r => r.status === 'accepted').length < 3}
		>
			Submit to Review
		</button>
	</div>
	<div></div>
</div>

{#if paper}
	<div class="container page max-w-[700px] p-4 m-auto">
		<h4 class="h4 px-4 text-primary-500 font font-semibold">Under Negotiation</h4>
		<hr class="mt-2 mb-4 border-t-2!" />
		<PaperPreview {paper} user={$page.data.user} />

		<!-- Hub Selection Section -->
		<div class="mt-6 space-y-4">
			<div class="flex items-center gap-2">
				<label class="relative inline-flex items-center cursor-pointer">
					<input type="checkbox" bind:checked={isLinkedToHub} class="sr-only peer" />
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
					></div>
					<span class="ml-3 text-sm font-medium text-gray-900">Link to Hub/Event</span>
				</label>
			</div>

			{#if isLinkedToHub}
				<div class="space-y-4">
					<h5 class="text-lg font-semibold">Available Hubs</h5>

					{#if isLoadingHubs}
						<div class="flex items-center justify-center p-4">
							<div
								class="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"
							></div>
						</div>
					{:else if availableHubs.length === 0}
						<p class="text-gray-500 p-4">No available hubs found</p>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each availableHubs as hub}
								<button
									class="relative w-full h-48 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] {selectedHub ===
									hub.id
										? 'ring-2 ring-primary-500'
										: ''}"
									onclick={() => (selectedHub = hub.id)}
								>
								<!-- Card image -->
								{#if hub.cardUrl}
									<img
										src={`/api/images/${hub.cardUrl}`}
										alt={`${hub.title} Card`}
										class="absolute w-full h-full object-cover"
									/>
								{:else}
									<div class="absolute w-full h-full bg-gradient-to-br from-primary-500 to-primary-700"></div>
								{/if}									<!-- Gradient overlay -->
									<div
										class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
									></div>

									<!-- Content -->
									<div class="absolute inset-0 p-4 flex flex-col justify-between text-white">
										<div>
											<h3 class="text-xl font-bold mb-2">{hub.title}</h3>
											<div class="flex items-center gap-2">
												{#if hub.logoUrl}
													<img
														src={`/api/images/${hub.logoUrl}`}
														alt={`${hub.title} Logo`}
														class="w-8 h-8 rounded-full border-2 border-white shadow-lg object-cover"
													/>
												{/if}
												<span class="text-sm text-white/90">{hub.type}</span>
											</div>
										</div>

										{#if hub.description}
											<p class="text-sm text-white/80 line-clamp-2">{hub.description}</p>
										{/if}

										{#if selectedHub === hub.id}
											<div
												class="absolute top-2 right-2 bg-primary-500 text-white px-2 py-1 rounded-full text-sm"
											>
												Selected
											</div>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			{#if selectedHub}
				<div class="flex justify-end mt-4">
					<button
						class="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
						onclick={confirmHubSelection}
					>
						Confirm Selection
					</button>
				</div>
			{/if}
		</div>

		<!-- Price -->
		<!-- <p>Amount</p>
		<div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
			<div class="input-group-shim">
				<Icon icon="material-symbols-light:attach-money-rounded" width="24" height="24" />
			</div>
			<input
				type="number"
				class="w-full p-2 border border-surface-300 rounded-lg"
				bind:value={paper.price}
				placeholder="Amount"
			/>
			<select><option>USD</option></select>
		</div> -->

		<!-- Image Upload Section -->
		<!-- <div class="mt-4">
			<h5 class="text-lg font-semibold mb-2">Paper Images</h5>
			<div class="grid grid-cols-2 gap-4">
				<div class="border-2 border-dashed border-surface-300 rounded-lg p-4">
					<FileUpload
						name="paper-images"
						onFileChange={handleImageUpload}
						maxFiles={1}
						accept="image/*"
					>
						<button class="btn variant-filled">
							<span>Add Image</span>
						</button>
					</FileUpload>
				</div>

				{#if imageItems.length > 0}
					<div class="grid grid-cols-2 gap-2 mt-4">
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
		</div> -->

		<!-- Peer Review Options -->
		<label for="peer_review" class="block mb-1">Peer Review Options</label>
		<select
			id="peer_review"
			name="peer_review"
			class="w-full p-2 border border-surface-300 rounded-lg"
			bind:value={peer_review}
		>
			<option value="" disabled selected>Select peer review option</option>
			<option value="open">Open</option>
			<option value="selected">Selected</option>
		</select>

		{#if peer_review === 'selected'}
			<!-- <AvailableReviewers {reviewers} {selectedReviewers} {toggleReviewerSelection} /> -->
			<ReviewerModal
				paperId={paper.id}
				users={reviewers}
				assignedReviewers={selectedReviewers}
				onReviewerChange={(newList) => (selectedReviewers = newList)}
			/>
			
			<!-- Invite Hub Reviewers (Only for hub owners) -->
			{#if data.isHubOwner && paper.hubId && typeof paper.hubId === 'object' && paper.hubId.reviewers}
				<div class="mt-4">
					<PaperReviewerInvite
						paperId={paper.id}
						hubId={typeof paper.hubId === 'object' ? paper.hubId._id || paper.hubId.id : paper.hubId}
						hubReviewers={paper.hubId.reviewers}
						currentAssignedReviewers={paper.peer_review?.assignedReviewers?.map(r => typeof r === 'object' ? r._id || r.id : r) || []}
					/>
				</div>
			{/if}
			
			<!-- Reviewer Status Display -->
			{#if paper.peer_review?.responses}
				{@const acceptedCount = paper.peer_review.responses.filter(r => r.status === 'accepted').length}
				{@const pendingCount = paper.peer_review.responses.filter(r => r.status === 'pending').length}
				{@const declinedCount = paper.peer_review.responses.filter(r => r.status === 'declined').length}
				
				<div class="mt-4 p-4 bg-surface-100 dark:bg-surface-700 rounded-lg">
					<h6 class="text-lg font-semibold mb-2">Reviewer Status</h6>
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div class="text-center">
							<div class="text-2xl font-bold text-green-600">{acceptedCount}</div>
							<div class="text-green-600">Accepted</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-yellow-600">{pendingCount}</div>
							<div class="text-yellow-600">Pending</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-red-600">{declinedCount}</div>
							<div class="text-red-600">Declined</div>
						</div>
					</div>
					
					{#if acceptedCount < 3}
						<div class="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 rounded text-yellow-800 dark:text-yellow-200 text-sm">
							⚠️ You need at least 3 reviewers to accept before submitting to review. Currently {acceptedCount}/3 accepted.
						</div>
					{:else}
						<div class="mt-3 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded text-green-800 dark:text-green-200 text-sm">
							✅ You have enough reviewers to submit for review!
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
{/if}
