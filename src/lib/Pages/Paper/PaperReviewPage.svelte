<script lang="ts">
	import { page } from '$app/state';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { onMount } from 'svelte';

	//AKIIIIIIIIIIIIIII
	import ReviewChat from '$lib/components/review/ReviewChat.svelte';
	// import { Types } from 'mongoose';

	import type { MessageFeed } from '$lib/types/MessageFeed';
	import type { Paper } from '$lib/types/Paper';
	import type { User } from '$lib/types/User';
	import { createEventDispatcher } from 'svelte';
	import ReviewForms from '../Review/ReviewForms.svelte';

	const dispatch = createEventDispatcher();

	// interface MessageFeed {
	// 	id: number; //trocar por uuid
	// 	host: boolean; //trocar por user
	// 	avatar: any; //trocar por user
	// 	name: string; //trocar por user
	// 	timestamp: string;
	// 	message: string;
	// }
	// const user1 = {
	// 	firstName: 'Almir',
	// 	lastName: 'Sater',
	// 	country: 'Brazil',
	// 	dob: '1956-09-14',
	// 	email: 'almirsater@gmail.com',
	// 	password:
	// 		'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
	// 	darkMode: false,
	// 	roles: {
	// 		author: true,
	// 		reviewer: true
	// 	},
	// 	bio: 'Almir Eduardo Melke Sater é um violeiro, cantor, compositor, ator e instrumentista brasileiro. Participou de diversos shows e festivais de música e, nos anos 1990, ao aceitar convites para representar em novelas "personagens de violeiro", se tornou conhecido nacionalmente como cantor e ator.',
	// 	profilePictureUrl:
	// 		'https://s2-g1.glbimg.com/F_t89bo5eGapJ7Fn8X-jdgOeI5I=/0x0:652x482/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/Y/Q/t6pMmUQvAgTNLoofL7tQ/agendao-cultural.jpg',
	// 	institution: 'Universidade Cândido Mendes',
	// 	position: 'Violeiro',
	// 	performanceReviews: {
	// 		averageReviewDays: 0,
	// 		recommendations: [],
	// 		responseTime: 0,
	// 		expertise: []
	// 	},
	// 	connections: [],
	// 	followers: [],
	// 	followersCount: 0,
	// 	following: [],
	// 	followingCount: 0,
	// 	createdAt: new Date('2024-08-26T14:11:28.456Z'),
	// 	updatedAt: new Date('2024-09-02T20:51:55.385Z'),
	// 	id: '22ae9df6-8ac3-4a7f-9135-bbe888217b5d',
	// 	username: '@almirsater',
	// 	papers: []
	// };
	// const user2 = {
	// 	firstName: 'Renato',
	// 	lastName: 'Teixeira',
	// 	country: 'Brazil',
	// 	dob: '1945-05-20',
	// 	username: '@renatoteixeira',
	// 	email: 'renatoteixeira@gmail.com',
	// 	password:
	// 		'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
	// 	darkMode: false,
	// 	roles: {
	// 		author: true,
	// 		reviewer: false
	// 	},
	// 	bio: '',
	// 	profilePictureUrl:
	// 		'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQcb5RJVepOCcdoz2eTtqM9rwLZ-ktJTBU3n4xBQ0W-V8mVJjet',
	// 	institution: '',
	// 	position: '',
	// 	performanceReviews: {
	// 		averageReviewDays: 0,
	// 		recommendations: [],
	// 		responseTime: 0,
	// 		expertise: []
	// 	},
	// 	connections: [],
	// 	followers: [],
	// 	followersCount: 0,
	// 	following: [],
	// 	followingCount: 0,
	// 	publications: [],
	// 	createdAt: new Date('2024-08-26T14:13:01.639Z'),
	// 	updatedAt: new Date('2024-08-26T14:13:01.639Z'),
	// 	id: '1f0d35ef-afaa-4d1c-afbd-fa8d16b6b23d',
	// 	papers: []
	// };
	// const lorem = faker.lorem.paragraph();
	// 	id: '597c84b3-d2a8-4fcc-950e-7ffff8739650',
	// 	messages: [
	// 		{
	// 			id: '1ce92d03-1eae-45e7-beff-9ac8af566474',
	// 			sender: user1,
	// 			timestamp: 'Yesterday @ 2:30pm',
	// 			message: 'lorem',
	// 			isRead: true,
	// 			color: 'variant-soft-primary'
	// 		}
	// 	]
	// };

	// console.log('44444',messageFeed)
	let currentMessage = '';

	// export let data = {
	// 	messageFeed,
	// 	currentMessage
	// };

	interface Props {
		messageFeed: any;
		paper: any;
		editable?: boolean;
		currentUser?: User;
	}

	let {
		messageFeed,
		paper,
		editable = false,
		currentUser
	}: Props = $props();
	// console.log('current', currentUser);
	// console.log('Reviewers', paper.reviewers);

	function hdlSaveDraft(e: any) {
		console.log('current message:', e.detail.currentMessage);
		//Fz um put que atualiza currentMessage
		currentMessage = e.detail.currentMessage;
	}

	// function hdlSubmitReview(e: any) {
	// 	console.log('asdas',e.detail);
	// 	//Fz um put que:
	// 	//1) atualiza os campos enviados em e.detail
	// 	//2) Muda status do paper
	// }
	// function hdlSubmitReview(e: any) {
	// 	//if (currentMessage.trim()) {
	// 	console.log('aquiAQUIaqui:', e.detail);
	// 	dispatch('sendMessage');
	// 	// currentMessage = '';
	// 	//}
	// }
	//

	function hdlSubmitReview(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		throw new Error('Function not implemented.');
	}

	// Function to style reference links
	function styleReferenceLinks() {
		if (typeof window !== 'undefined') {
			const contentElements = document.querySelectorAll('.paper-content');

			contentElements.forEach((element) => {
				const html = element.innerHTML;
				const styledHtml = html.replace(
					/\[(\d+)\]/g,
					'<span class="reference-link text-primary-500 hover:text-primary-950 cursor-pointer font-medium">[<span class="reference-number">$1</span>]</span>'
				);
				element.innerHTML = styledHtml;
			});
		}
	}

	onMount(() => {
		styleReferenceLinks();
	});
</script>

<main class="w-full max-w-none px-2 md:px-4">
	<fieldset class="py-4 md:py-6">
		{#if editable}
			<div class="flex justify-end gap-3 mb-4">
				<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSaveDraft}
					>Save Draft</button
				>
				<button class="bg-primary-500 text-white rounded-lg px-4 py-2" onclick={hdlSubmitReview}
					>Submit Article</button
				>
			</div>
		{/if}

		<!-- Nova seção com Paper completo e ReviewForms lado a lado -->
		<div class="mb-8 flex gap-4 w-full">
			<!-- Paper completo à esquerda -->
			<section class="flex-1 min-w-0">
				<div class="p-4 md:p-6 bg-white rounded-lg shadow-lg">
					<!-- Título do Paper -->
					<h2 class="text-3xl font-semibold text-gray-800 mb-4">{paper.title}</h2>

					<!-- Autores -->
					<div class="flex gap-3 items-center mb-4">
						{#if paper.mainAuthor?.profilePictureUrl}
							<Avatar
								src={paper.mainAuthor.profilePictureUrl}
								name={`${paper.mainAuthor.firstName} ${paper.mainAuthor.lastName}`}
								size="w-9"
							/>
						{:else}
							<Avatar
								name="{paper.mainAuthor.firstName} {paper.mainAuthor.lastName}"
								size="w-9"
								style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
							/>
						{/if}
						<div class="flex items-center">
							<a
								class="text-primary-500 whitespace-nowrap"
								href="/profile/{paper.mainAuthor?.username}"
							>
								{paper.mainAuthor.firstName}
								{paper.mainAuthor.lastName}
							</a>
						</div>

						<!-- Coautores -->
						{#each paper.coAuthors as ca}
							<div class="flex items-center gap-2">
								{#if ca.profilePictureUrl}
									<Avatar
										src={ca.profilePictureUrl}
										name={`${ca.firstName} ${ca.lastName}`}
										size="w-9"
									/>
								{:else}
									<Avatar
										name="{ca.firstName} {ca.lastName}"
										size="w-9"
										style="width: 2.25rem; height: 2.25rem; display: flex; align-items: center; justify-content: center; background-color: silver; color: white; border-radius: 9999px;"
									/>
								{/if}
								<div class="flex items-center">
									<a class="text-primary-500 whitespace-nowrap" href="/profile/{ca.username}">
										{ca.firstName}
										{ca.lastName}
									</a>
								</div>
							</div>
						{/each}
					</div>

					<span class="text-xs">Published: {new Date(paper.createdAt).toDateString()}</span>

					<!-- Imagem Principal -->
					{#if paper.paperPictures && paper.paperPictures.length > 0}
						<img
							src={`/api/images/${paper.paperPictures[0]}`}
							alt="Imagem do artigo"
							class="w-full h-full object-cover rounded-sm mb-4"
						/>
					{:else}
						<!-- Placeholder caso não haja imagem -->
						<div
							class="bg-gray-300 w-full h-48 rounded-sm flex items-center justify-center text-gray-500 mb-4"
						>
							<span>No image available</span>
						</div>
					{/if}

					<!-- Abstract -->
					<h3 class="mt-4 text-surface-900 font-bold prose text-2xl max-w-none">Abstract</h3>
					<div class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg paper-content">
						{@html paper.abstract}
					</div>

					<!-- Conteúdo completo -->
					<div
						class="mt-4 text-surface-950 prose prose-m max-w-none [&>p]:text-lg [&>ol>li]:text-base [&>ol>li]:marker:text-primary-500 paper-content"
					>
						{@html paper.content}
					</div>

					<!-- Tags/Keywords -->
					{#if paper.keywords && paper.keywords.length > 0}
						<div class="mt-4 flex flex-wrap gap-2">
							{#each paper.keywords as keyword}
								<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">
									{keyword}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</section>

			<!-- ReviewForms à direita -->
			<section class="w-96 flex-shrink-0">
				{#if page.url.pathname.startsWith('/review/inreview/')}
					<div class="card p-4 h-full">
						<ReviewForms
							paperTitle={paper.title}
							paperId={paper.id}
							reviewerId={currentUser?.id || ''}
						/>
					</div>
				{/if}
			</section>
		</div>

		<hr class="my-4" />

		<!-- Seção do PDF (opcional, pode remover se não precisar) -->
		<div class="mb-8 w-full">
			<div class="border border-gray-300 p-2 md:p-4 h-[80vh] w-full">
				<iframe
					src={`/api/pdfs/${paper.pdfUrl}`}
					title="PDF file"
					frameborder="1"
					class="h-full w-full"
				></iframe>
			</div>
		</div>
	</fieldset>
</main>
<!-- <ReviewForms
    
    {editable}
    {currentUser}
    on:saveDraft={hdlSaveDraft}
    on:submitReview={hdlSubmitReview}
></ReviewForms> -->
<!-- <ReviewForms paperTitle={paper.title} /> -->
