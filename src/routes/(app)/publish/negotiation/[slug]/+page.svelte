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
	let selectedReviewers: string[] = $state([]);

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

	function toggleReviewerSelection(reviewerId: string) {
		if (selectedReviewers.includes(reviewerId)) {
			selectedReviewers = selectedReviewers.filter((id) => id !== reviewerId);
		} else {
			selectedReviewers = [...selectedReviewers, reviewerId];
		}
	}

	async function handleSavePaper(event: MouseEvent) {
		if (!paper) return;

		try {
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
</script>

<!-- UI HTML -->
<div class="grid grid-cols-[1fr_1fr_1fr] p-5">
	<div></div>
	<div class="flex justify-between gap-3">
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}>
			Save Draft
		</button>
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={handleSavePaper}>
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

		<!-- Price -->
		<p>Amount</p>
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
		</div>

		<!-- Image Upload Section -->
		<div class="mt-4">
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
		</div>

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
			<AvailableReviewers {reviewers} {selectedReviewers} {toggleReviewerSelection} />
		{/if}
	</div>
{/if}
