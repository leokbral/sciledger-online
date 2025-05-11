<script lang="ts">
	import { page } from '$app/state';
	import PaperPreview from '$lib/PaperList/PaperPreview.svelte';
	
	//AKIIIIIIIIIIIIIII
	import ReviewChat from '$lib/components/review/ReviewChat.svelte';
	// import { Types } from 'mongoose';
	
	import type { MessageFeed } from '$lib/types/MessageFeed';
	import type { Paper } from '$lib/types/Paper';
	import type { User } from '$lib/types/User';
	import { faker } from '@faker-js/faker';
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
	const user1 = {
		firstName: 'Almir',
		lastName: 'Sater',
		country: 'Brazil',
		dob: '1956-09-14',
		email: 'almirsater@gmail.com',
		password:
			'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
		darkMode: false,
		roles: {
			author: true,
			reviewer: true
		},
		bio: 'Almir Eduardo Melke Sater é um violeiro, cantor, compositor, ator e instrumentista brasileiro. Participou de diversos shows e festivais de música e, nos anos 1990, ao aceitar convites para representar em novelas "personagens de violeiro", se tornou conhecido nacionalmente como cantor e ator.',
		profilePictureUrl:
			'https://s2-g1.glbimg.com/F_t89bo5eGapJ7Fn8X-jdgOeI5I=/0x0:652x482/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_59edd422c0c84a879bd37670ae4f538a/internal_photos/bs/2022/Y/Q/t6pMmUQvAgTNLoofL7tQ/agendao-cultural.jpg',
		institution: 'Universidade Cândido Mendes',
		position: 'Violeiro',
		performanceReviews: {
			averageReviewDays: 0,
			recommendations: [],
			responseTime: 0,
			expertise: []
		},
		connections: [],
		followers: [],
		followersCount: 0,
		following: [],
		followingCount: 0,
		createdAt: new Date('2024-08-26T14:11:28.456Z'),
		updatedAt: new Date('2024-09-02T20:51:55.385Z'),
		id: '22ae9df6-8ac3-4a7f-9135-bbe888217b5d',
		username: '@almirsater',
		papers: []
	};
	const user2 = {
		firstName: 'Renato',
		lastName: 'Teixeira',
		country: 'Brazil',
		dob: '1945-05-20',
		username: '@renatoteixeira',
		email: 'renatoteixeira@gmail.com',
		password:
			'b393f81c729c894143e609671b9b86d24ba3c36f826feaea4b1b74000d94179785eb3458b3584bca34e9fee64eedd26ab765b93a61dde16e43d5caac5b736acc',
		darkMode: false,
		roles: {
			author: true,
			reviewer: false
		},
		bio: '',
		profilePictureUrl:
			'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQcb5RJVepOCcdoz2eTtqM9rwLZ-ktJTBU3n4xBQ0W-V8mVJjet',
		institution: '',
		position: '',
		performanceReviews: {
			averageReviewDays: 0,
			recommendations: [],
			responseTime: 0,
			expertise: []
		},
		connections: [],
		followers: [],
		followersCount: 0,
		following: [],
		followingCount: 0,
		publications: [],
		createdAt: new Date('2024-08-26T14:13:01.639Z'),
		updatedAt: new Date('2024-08-26T14:13:01.639Z'),
		id: '1f0d35ef-afaa-4d1c-afbd-fa8d16b6b23d',
		papers: []
	};
	const lorem = faker.lorem.paragraph();
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
		currentUser = user1
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
</script>

<main class="grid p-5">
	<fieldset class="py-4 md:py-6">
		<section id="article-body" class="flex flex-col items-center max-w-[700px] m-auto">
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
			<PaperPreview {paper} user={page.data.user} />
		</section>

		<hr class="my-4" />
		<section id="pdf" class="md:max-w-[1280px] w-full px-3 flex flex-col m-auto">
			<section id="pdf" class=" p-4">
				<!-- <ArticleBody bind:this={articleBody} body={$store.body}></ArticleBody> -->
			</section>
			<hr class="" />
		</section>
		<div class="mb-8">
			<!-- <h2 class="text-xl font-semibold mb-2">{pdf.filename}</h2> -->
			<div class="border border-gray-300 p-4 h-[80vh] w-full flex justify-between">
				<iframe
					src={`/api/pdfs/${paper.pdfUrl}`}
					title="PDF file"
					frameborder="1"
					class="h-full w-1/2"
				></iframe>
				<section class="card w-1/2">
					<!-- <ReviewChat on:saveDraft={hdlSaveDraft} on:submitReview {data} {currentUser}></ReviewChat> -->
				</section>
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
<ReviewForms paperTitle={paper.title} />