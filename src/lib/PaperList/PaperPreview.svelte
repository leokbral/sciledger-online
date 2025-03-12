<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Paper } from '$lib/types/Paper';
	import { getInitials } from '$lib/utils/GetInitials';
	import { Avatar, Rating } from '@skeletonlabs/skeleton-svelte';

	let { paper, user } = $props();
	let starValue = $state(2);
	// export let paper: Paper;
	// export let user;
	// console.log('paper -- ', paper);
</script>

<div class="flex flex-col gap-3">
	<div class="flex gap-3 items-center">
		<div>
			<div class="flex gap-3 items-center">
				<!-- <a href="/profile/{paper.mainAuthor?.username}"> -->
				<div class="flex gap-3 items-center">
					{#if paper.mainAuthor?.profilePictureUrl}
						<Avatar
							src={paper.mainAuthor.profilePictureUrl}
							name={paper.mainAuthor.username}
							size="w-9"
						/>
					{:else if paper.mainAuthor?.firstName && paper.mainAuthor?.lastName}
						<div
							class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full"
						>
							<span class="text-2xl font-bold"
								>{getInitials(paper.mainAuthor.firstName, paper.mainAuthor.lastName)}</span
							>
						</div>
					{:else}
						<div
							class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full"
						>
							<span class="text-sm font-bold">N/A</span>
						</div>
					{/if}
					<div class="flex flex-col justify-center">
						<a class="text-primary-500" href="/profile/{paper.mainAuthor?.username}">
							{paper.mainAuthor.username || 'ERROR-404'}
						</a>
					</div>

					<!-- Coautores -->
					{#each paper.coAuthors as ca}
						<a href="/profile/{ca.username}">
							{#if ca.profilePictureUrl}
								<Avatar src={ca.profilePictureUrl} name={ca.username} size="w-9" />
							{:else if ca.firstName && ca.lastName}
								<div
									class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full"
								>
									<span class="text-2xl font-bold">
										{getInitials(ca.firstName, ca.lastName)}
									</span>
								</div>
							{:else}
								<div
									class="w-9 h-9 flex items-center justify-center bg-gray-300 text-white rounded-full"
								>
									<span class="text-sm font-bold">N/A</span>
								</div>
							{/if}
						</a>
						<div class="flex flex-col justify-center">
							<a class="text-primary-500" href="/profile/{ca.username}">
								{ca.username}
							</a>
						</div>
					{/each}
				</div>
				<!-- </a> -->
			</div>
			<span class="text-xs">{new Date(paper.createdAt).toDateString()}</span>
		</div>
		{#if user}
			<form
				method="POST"
				action="/articles/{paper.id}?/toggleFavorite"
				use:enhance={({ formElement }) => {
					// optimistic UI
					// if (paper.favorited) {
					// 	paper.favorited = false;
					// 	paper.favoritesCount -= 1;
					// } else {
					// 	paper.favorited = true;
					// 	paper.favoritesCount += 1;
					// }

					const button = formElement.querySelector('button');
					if (button) button.disabled = true;

					return ({ result, update }) => {
						if (button) button.disabled = false;
						if (result.type === 'error') update();
					};
				}}
				class="pull-xs-right"
			>
				<!-- <input hidden type="checkbox" name="favorited" checked={paper.favorited} />
				<button class="btn btn-sm {paper.favorited ? 'btn-primary' : 'btn-outline-primary'}">
					<i class="ion-heart" />
					{paper.favoritesCount}
				</button> -->
			</form>
		{/if}
	</div>

	<img
		src={paper.paperPictures ? paper.paperPictures[0] : ''}
		alt="Post"
		class="w-full h-48 object-cover rounded-sm"
	/>
	<h4 class="h4 font-bold">{paper.title}</h4>
	<p>{paper.abstract}</p>
	<div class="flex justify-between my-3">
		<span class="text-xs"
			><a data-sveltekit-reload href="/articles/{paper.id}" class="flex flex-col gap-2"
				>Read more...</a
			></span
		>
		<div class="tag-list flex gap-1">
			{#each paper.keywords as tag}
				<span class="badge preset-outlined-primary-500 text-primary-500"
					><a href="/?tag={tag}">{tag}</a></span
				>
			{/each}
		</div>
	</div>
</div>

<div class="">
	<Rating value={3.5} allowHalf readOnly>
		{#snippet iconEmpty()}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="2em"
				height="2em"
				viewBox="0 0 24 24"
				
			>
				<path
					fill="currentColor"
					d="M8.125 7.092L12 1.937l3.875 5.155l6.139 2.07l-3.941 5.336l.156 6.056L12 18.733l-6.229 1.82l.156-6.08l-3.915-5.312zm.629.86l-5.1 1.735l3.292 4.494l-.138 5.006L12 17.697l5.192 1.534l-.138-5.05l3.292-4.444l-5.1-1.785L12 3.616zM12 11.423"
				/>
			</svg>
		{/snippet}
		{#snippet iconFull()}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="2em"
				height="2em"
				viewBox="0 0 24 24"
				
			>
				<path
					fill="currentColor"
					d="M8.125 7.092L12 1.937l3.875 5.155l6.139 2.07l-3.941 5.336l.156 6.056L12 18.733l-6.229 1.82l.156-6.08l-3.915-5.312zm.629.86l-5.1 1.735l3.292 4.494l-.138 5.006L12 17.697l5.192 1.534l-.138-5.05l3.292-4.444l-5.1-1.785L12 3.616zM12 11.423"
				/>
			</svg>
		{/snippet}
		<!-- <svelte:fragment slot="empty"
			></svelte:fragment
		>
		<svelte:fragment slot="half"
			><svg
				xmlns="http://www.w3.org/2000/svg"
				width="2em"
				height="2em"
				viewBox="0 0 24 24"
				{...$$props}
			>
				<path
					fill="currentColor"
					d="M8.125 7.092L12 1.937l3.875 5.155l6.139 2.07l-3.941 5.336l.156 6.056L12 18.733l-6.229 1.82l.156-6.08l-3.915-5.312zm.629.86l-5.1 1.735l3.292 4.494l-.138 5.006L12 17.697l5.192 1.534l-.138-5.05l3.292-4.444l-5.1-1.785L12 3.616zM12 11.423"
				/>
			</svg></svelte:fragment
		>
		<svelte:fragment slot="full"
			><svg
				xmlns="http://www.w3.org/2000/svg"
				width="2em"
				height="2em"
				viewBox="0 0 24 24"
				{...$$props}
			>
				<path
					fill="currentColor"
					d="M8.125 7.092L12 1.937l3.875 5.155l6.139 2.07l-3.941 5.336l.156 6.056L12 18.733l-6.229 1.82l.156-6.08l-3.915-5.312zm.629.86l-5.1 1.735l3.292 4.494l-.138 5.006L12 17.697l5.192 1.534l-.138-5.05l3.292-4.444l-5.1-1.785L12 3.616zM12 11.423"
				/>
			</svg></svelte:fragment
		> -->
	</Rating>
</div>
<hr class="border-t-1! mb-6 mt-1" />
