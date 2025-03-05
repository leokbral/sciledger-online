<script lang="ts">
	import { onMount } from 'svelte';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { createEventDispatcher } from 'svelte';
	import type { User } from '$lib/types/User';
	import type { MessageFeed } from '$lib/types/MessageFeed';
	// import { Types } from 'mongoose'; Isso deu erro!
	import { page } from '$app/stores';
	import { get } from 'svelte/store';

	const dispatch = createEventDispatcher();

	// Types
	// interface MessageFeed {
	// 	id: number;
	// 	host: boolean;
	// 	avatar: any;
	// 	name: string;
	// 	timestamp: string;
	// 	message: string;
	// 	color: string;
	// }

	let submitButtonText = '';

	onMount(() => {
		const currentPath = get(page).url.pathname;
		if (currentPath === '/publish/corrections/${.id}') {
			// PRECISA MODIFICAR O PATH PARA FUNCIONAR CORRETAMENTE
			submitButtonText = 'Submit Correction';
		} else {
			submitButtonText = 'Submit Review';
		}
	});

	let elemChat: HTMLElement;

	export let data: any;
	export let currentUser: User;

	// Initialize messageFeed with default values if data.messageFeed is null
	let messageFeed: MessageFeed = data?.messageFeed ?? {
		messages: [],
		currentMessage: ''
	};
	
	// Initialize currentMessage with a default empty string
	let currentMessage: string = messageFeed?.currentMessage ?? '';

	function scrollChatBottom(behavior?: ScrollBehavior): void {
		elemChat.scrollTo({ top: elemChat.scrollHeight, behavior });
	}

	function getCurrentTimestamp(): string {
		return new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
	}

	function hdlSubmit(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		const newMessage = {
			//_id: crypto.randomUUID(),
			id: crypto.randomUUID(),
			sender: currentUser,
			isRead: true,
			timestamp: `Today @ ${getCurrentTimestamp()}`,
			message: currentMessage,
			color: 'variant-soft-primary'
		};
		// Update the message feed
		messageFeed.messages = [...messageFeed.messages, newMessage];

		// Clear prompt
		currentMessage = '';
		// Smooth scroll to bottom
		// Timeout prevents race condition
		setTimeout(() => {
			scrollChatBottom('smooth');
		}, 0);
		dispatch('submitReview', { newMessage, currentMessage });
	}

	function hdlSaveDraft(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		dispatch('saveDraft', { currentMessage });
	}

	// When DOM mounted, scroll to bottom
	onMount(() => {
		scrollChatBottom();
	});
</script>

<!-- Chat -->
<div class="">
	<!-- Conversation -->
	<section bind:this={elemChat} class="max-h-[400px] p-4 overflow-y-auto space-y-4">
		{#if messageFeed?.messages}
			{#each messageFeed.messages as bubble}
				{#if bubble.sender.id === currentUser.id}
					<div class="grid grid-cols-[auto_1fr] gap-2">
						<Avatar src={bubble.sender.profilePictureUrl} width="w-12" />
						<div class="card p-4 variant-soft rounded-tl-none space-y-2">
							<header class="flex justify-between items-center">
								<p class="font-bold">{bubble.sender.username}</p>
								<small class="opacity-50">{bubble.timestamp}</small>
							</header>
							<p>{bubble.message}</p>
						</div>
					</div>
				{:else}
					<div class="grid grid-cols-[1fr_auto] gap-2">
						<div class="card p-4 rounded-tr-none space-y-2 variant-soft-primary">
							<header class="flex justify-between items-center">
								<p class="font-bold">{bubble.sender.username}</p>
								<small class="opacity-50">{bubble.timestamp}</small>
							</header>
							<p>{bubble.message}</p>
						</div>
						<Avatar src={bubble.sender.profilePictureUrl} width="w-12" />
					</div>
				{/if}
			{/each}
		{/if}
	</section>
	<!-- Prompt -->
	<section class="border-t border-surface-500/30 p-4">
		<textarea
			bind:value={currentMessage}
			class="ring-0 w-full h-auto"
			name="prompt"
			id="prompt"
			rows="9"
			placeholder="Write a message..."
		></textarea>
	</section>
	<div class="flex justify-around gap-3">
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={hdlSaveDraft}
			>Save Draft</button
		>
		<button class="bg-primary-500 text-white rounded-lg px-4 py-2" on:click={hdlSubmit}
			>{submitButtonText}</button
		>
	</div>
</div>
