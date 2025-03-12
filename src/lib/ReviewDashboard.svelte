<script lang="ts">
	interface Props {
		reviews?: any[];
		user?: any;
	}

	let { reviews = [], user = {} }: Props = $props();
  
	let articlesPendingReview = 0;
	let articlesInReview = 0;
	let articlesReviewed = 0;
	let articlesNeedingCorrections = 0;
	let articlesAwaitingFinalApproval = 0;
	let notifications = 0;
	let underNegotiation = 0;
	let messages = 0;
	let recentReviewedArticles = 0;
	let commentsSent = 0;
	let reviewsRequested = 0;
	let avgReviewTime = $state(0);
	let totalReviewedArticles = 0;
	let acceptanceRate = 0;
	let articleImpact = 0;
	let drafts = 0;
	let upcomingDeadlines = 0;
	let averageFeedback = $state('N/A');
	let value = 0; 
  
	// Verifique se os dados do revisor estão definidos antes de usá-los
	if (reviews?.length) {
	  articlesPendingReview = reviews.filter((review: any) => review.status === 'pending').length;
	  articlesInReview = reviews.filter((review: any) => review.status === 'in review').length;
	  articlesReviewed = reviews.filter((review: any) => review.status === 'reviewed').length;
	  articlesNeedingCorrections = reviews.filter((review: any) => review.status === 'needs corrections').length;
	  articlesAwaitingFinalApproval = reviews.filter((review: any) => review.status === 'awaiting approval').length;
	}
  
	if (user) {
	  notifications = user.notifications?.length || 0;
	  underNegotiation = user.underNegotiation?.length || 0;
	  messages = user.messages?.length || 0;
	  commentsSent = user.commentsSent?.length || 0;
	  reviewsRequested = user.reviewsRequested?.length || 0;
  
	  // Calcular o tempo médio de revisão, caso exista o campo 'reviewDate'
	  if (reviews?.length) {
		avgReviewTime = reviews.reduce(
		  (sum: number, review: { reviewDate: string | number | Date; createdAt: string | number | Date }) =>
			sum + (new Date(review.reviewDate).getTime() - new Date(review.createdAt).getTime()),
		  0
		) / reviews.length / (1000 * 3600 * 24); // converter para dias
	  }
  
	  // Calcular a taxa de aceitação (exemplo simples)
	  articlesReviewed = articlesReviewed || 0;
	  articlesNeedingCorrections = articlesNeedingCorrections || 0;
	  if (articlesReviewed > 0) {
		acceptanceRate = (articlesReviewed - articlesNeedingCorrections) / articlesReviewed * 100;
	  }
  
	  // Definir impacto dos artigos (simulação, pode vir do banco de dados ou de um campo específico)
	  articleImpact = user.articleImpact || 3.8;
  
	  // Calcular o feedback médio (exemplo simples)
	  if (user.feedback?.avgScore) {
		averageFeedback = user.feedback.avgScore || 'N/A';
	  }
  
	  // Calcular a porcentagem de progresso ou conclusão
	  value = (recentReviewedArticles / totalReviewedArticles) * 100;
	}
  </script>
  


<!-- <section>
	<div class="p-6 bg-surface-100 mb-4 text-surface-900">
		<div class="text-xl font-bold mb-6">Your Activities</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
			< !-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M5 18.77v-1h1.616V9.845q0-1.96 1.24-3.447T11 4.546V4q0-.417.291-.708q.291-.292.707-.292t.709.292T13 4v.546q1.904.365 3.144 1.853t1.24 3.447v7.923H19v1zm6.997 2.615q-.668 0-1.14-.475t-.472-1.14h3.23q0 .67-.475 1.142q-.476.472-1.143.472M7.616 17.77h8.769V9.846q0-1.823-1.281-3.104T12 5.462t-3.104 1.28t-1.28 3.104z"
						/>
					</svg>
					Notifications
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{notifications}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<a href="./review/messages" class="">
					<p
						class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="2em"
							height="2em"
							viewBox="0 0 24 24"
							{...$$props}
						>
							<g fill="none" stroke="currentColor">
								<rect width="16" height="12" x="4" y="6" rx="2" />
								<path d="m4 9l7.106 3.553a2 2 0 0 0 1.788 0L20 9" />
							</g>
						</svg>
						Messages
						<span
							class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
						>
							{messages}
						</span>
					</p>
				</a>
			</div> -->
<!-- 
			<div class="relative">
				<a href="./review/inreview" class="">
					<p
						class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="2em"
							height="2em"
							viewBox="0 0 24 24"
							{...$$props}
						>
							<path
								fill="currentColor"
								d="M6.385 13.616h2.204l5.269-5.27q.128-.148.193-.31t.065-.322t-.068-.317q-.067-.156-.19-.305l-.92-.95q-.129-.129-.298-.193t-.334-.064q-.16 0-.322.064t-.311.193l-5.288 5.27zm6.846-5.902l-.925-.945zM7.269 12.73v-.95l3.448-3.448l.462.488l.469.481l-3.429 3.429zm3.91-3.91l.469.481l-.93-.97zm.63 4.795h5.807v-1H12.81zM3 20.077V4.616q0-.691.463-1.153T4.615 3h14.77q.69 0 1.152.463T21 4.616v10.769q0 .69-.463 1.153T19.385 17H6.077zM5.65 16h13.735q.23 0 .423-.192t.192-.423V4.615q0-.23-.192-.423T19.385 4H4.615q-.23 0-.423.192T4 4.615v13.03zM4 16V4z"
							/>
						</svg>
						In Review
						<span
							class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
						>
							{articlesInReview}
						</span>
					</p>
				</a>
			</div>

			<div class="relative">
				<a href="./review/correction" class="">
					<p
						class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="2em"
							height="2em"
							viewBox="0 0 24 24"
							{...$$props}
						>
							<path
								fill="currentColor"
								d="M11.846 18.25h1v-1h1.5q.214 0 .357-.143t.143-.357v-3q0-.213-.143-.357q-.143-.143-.357-.143h-3.5v-2h4v-1h-2v-1h-1v1h-1.5q-.213 0-.356.143t-.144.357v3q0 .214.144.357t.356.143h3.5v2h-4v1h2zM6.616 21q-.691 0-1.153-.462T5 19.385V4.615q0-.69.463-1.152T6.616 3H14.5L19 7.5v11.885q0 .69-.462 1.153T17.384 21zM14 7.77V4H6.616q-.231 0-.424.192T6 4.615v14.77q0 .23.192.423t.423.192h10.77q.23 0 .423-.192t.192-.424V7.77zM6 4v3.77zv16z"
							/>
						</svg>
						Review Requested
						<span
							class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
						>
							{reviewsRequested}
						</span>
					</p>
				</a>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M17.385 21q-1.672 0-2.836-1.164Q13.385 18.67 13.385 17t1.164-2.835T17.384 13q1.672 0 2.836 1.165q1.165 1.164 1.165 2.835t-1.165 2.836T17.385 21m.384-4.165V14.5q0-.154-.115-.27q-.116-.114-.27-.114q-.153 0-.269.115q-.115.115-.115.269v2.333q0 .153.056.297q.055.143.186.274l1.525 1.525q.112.111.264.121t.282-.121t.131-.273t-.13-.273zM5.616 20q-.667 0-1.141-.475T4 18.386V5.615q0-.666.475-1.14T5.615 4h4.637q.14-.586.623-.985q.483-.4 1.125-.4q.654 0 1.134.4q.48.398.62.985h4.63q.667 0 1.142.475T20 5.615v4.808q0 .213-.144.356t-.357.144t-.356-.144t-.143-.356V5.616q0-.231-.192-.424T18.384 5H16v1.423q0 .343-.23.576t-.57.232H8.8q-.34 0-.57-.232T8 6.423V5H5.616q-.231 0-.424.192T5 5.616v12.769q0 .269.173.442t.443.173h5.826q.213 0 .357.144t.143.357t-.143.356t-.357.143zm6.387-14.77q.345 0 .575-.232q.23-.233.23-.578t-.233-.575t-.578-.23t-.575.234t-.23.578t.234.574t.577.23"
						/>
					</svg>
					Articles Pending Review
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{articlesPendingReview}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M6.616 21q-.691 0-1.153-.462T5 19.385V4.615q0-.69.463-1.152T6.616 3H14.5L19 7.5v11.885q0 .69-.462 1.153T17.384 21zM14 8V4H6.616q-.231 0-.424.192T6 4.615v14.77q0 .23.192.423t.423.192h10.77q.23 0 .423-.192t.192-.424V8zM6 4v4zv16z"
						/>
					</svg>
					Drafts
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{drafts}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M7 6V5c0-1.414 0-2.121.44-2.56C7.878 2 8.585 2 10 2h4c1.414 0 2.121 0 2.56.44C17 2.878 17 3.585 17 5v1c0 1.414 0 2.121-.44 2.56C16.122 9 15.415 9 14 9h-1l-3 2V9c-1.414 0-2.121 0-2.56-.44C7 8.122 7 7.415 7 6M3.59 18.74c-.629.422-2.277 1.282-1.273 2.358c.49.526 1.037.902 1.723.902h3.92c.686 0 1.233-.376 1.723-.902c1.004-1.076-.644-1.936-1.273-2.357a4.29 4.29 0 0 0-4.82 0m12-.001c-.629.422-2.277 1.282-1.273 2.358c.49.526 1.037.902 1.723.902h3.92c.686 0 1.233-.376 1.723-.902c1.004-1.076-.644-1.936-1.273-2.357a4.29 4.29 0 0 0-4.82 0M8 13.5a2 2 0 1 1-4 0a2 2 0 0 1 4 0m12 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0"
							color="currentColor"
						/>
					</svg>
					Under Negotiation
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{underNegotiation}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M9.385 2.5v-1h5.23v1zM11.5 13.616h1V8.385h-1zM12 21q-1.658 0-3.113-.626t-2.545-1.716t-1.716-2.546T4 13t.626-3.113t1.716-2.545t2.546-1.716T12 5q1.454 0 2.812.52t2.492 1.469l1.092-1.093l.708.708l-1.092 1.092q.95 1.135 1.469 2.493T20 13q0 1.658-.626 3.113t-1.716 2.545t-2.546 1.716T12 21m0-1q2.9 0 4.95-2.05T19 13t-2.05-4.95T12 6T7.05 8.05T5 13t2.05 4.95T12 20m0-7"
						/>
					</svg>
					Upcoming Deadlines
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{upcomingDeadlines}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M6.998 13q.416 0 .709-.291T8 12.002t-.291-.709T7.002 11t-.709.291t-.293.707t.291.709t.707.293m5 0q.416 0 .709-.291t.293-.707t-.291-.709t-.707-.293t-.709.291t-.293.707t.291.709t.707.293m5 0q.416 0 .709-.291t.293-.707t-.291-.709t-.707-.293t-.709.291t-.293.707t.291.709t.707.293m-4.995 8q-1.866 0-3.51-.708q-1.643-.709-2.859-1.924t-1.925-2.856T3 12.003t.709-3.51Q4.417 6.85 5.63 5.634t2.857-1.925T11.997 3t3.51.709q1.643.708 2.859 1.922t1.925 2.857t.709 3.509t-.708 3.51t-1.924 2.859t-2.856 1.925t-3.509.709M12 20q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"
						/>
					</svg>
					Needing Corrections
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{articlesNeedingCorrections}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="m9.55 17.308l-4.97-4.97l.714-.713l4.256 4.256l9.156-9.156l.713.714z"
						/>
					</svg>
					Articles Reviewed
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{articlesReviewed}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					Articles Awaiting Final Approval
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{articlesAwaitingFinalApproval}
					</span>
				</p>
			</div> -->

			<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2em"
						height="2em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M6.5 13.5h11v-1h-11zm0-3h11v-1h-11zm0-3h11v-1h-11zM21 20.077L17.923 17H4.616q-.691 0-1.154-.462T3 15.385V4.615q0-.69.463-1.153T4.615 3h14.77q.69 0 1.152.462T21 4.615zM4.616 16H18.35L20 17.644V4.616q0-.231-.192-.424T19.385 4H4.615q-.23 0-.423.192T4 4.615v10.77q0 .23.192.423t.423.192M4 16V4z"
						/>
					</svg>
					Comments Sent
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{commentsSent}
					</span>
				</p>
			</div> -- >
		</div>

		< !-- <div class="text-2xl font-bold mb-4">Quick Actions</div>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
			<button class="bg-blue-500 text-white p-4 rounded shadow hover:bg-blue-600"
				>Review New Article
			</button>
			<button class="bg-blue-500 text-white p-4 rounded shadow hover:bg-blue-600"
				>View Notifications
			</button>
			<button class="bg-blue-500 text-white p-4 rounded shadow hover:bg-blue-600"
				>Send Message
			</button>
			<button class="bg-blue-500 text-white p-4 rounded shadow hover:bg-blue-600"
				>Update Profile
			</button>
			<button class="bg-blue-500 text-white p-4 rounded shadow hover:bg-blue-600"
				>Manage Review Preferences
			</button>
		</div> -- >
	</div>
</section> -->

<!-- Section Personal Status -->
<section>
	<div class="text-xl font-bold mb-4 text-surface-900-50">Personal Statistics</div>
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<div class="bg-white p-4 shadow rounded flex flex-col items-center text-surface-900">
			<p class="text-lg font-semibold text-center">Average Review Time (days)</p>
			<p class="text-2xl text-center">{avgReviewTime}</p>
		</div>

		<div class="bg-white p-4 shadow rounded flex flex-col items-center text-surface-900">
			<p class="text-lg font-semibold text-center">Total Articles Reviewed</p>
			<p class="text-2xl text-center">{totalReviewedArticles}</p>
		</div>

		<!-- <div class="bg-white p-4 shadow rounded flex flex-col items-center text-surface-900 gap-4">
			<p class="text-lg font-semibold text-center">Acceptance Rate (%)</p>
			<div class="flex items-center justify-center">
				<ProgressRadial
					value={acceptanceRate}
					meter="stroke-primary-500"
					track="stroke-primary-500/30 text"
				>
					{acceptanceRate}%</ProgressRadial
				>
			</div>
		</div> -->

		<div class="bg-white p-4 shadow rounded flex flex-col items-center text-surface-900">
			<p class="text-lg font-semibold text-center">Average Feedback</p>
			<p class="text-2xl text-center">{averageFeedback}</p>
		</div>
	</div>
</section>

<!-- <section>
	<div class="bg-white shadow-md rounded p-6 mb-8">
		<h3 class="text-xl font-bold mb-4">Your Reviews</h3>
		<p class="text-gray-700 mb-4">
			Keep track of the progress of your submitted articles and check the performance of your
			publications.
		</p>
		<div class="flex flex-wrap justify-between space-y-4 md:space-y-0">
			<div class="w-full md:w-1/2">
				<p class="font-bold">Published: 10</p>
				<p class="font-bold">In review: 3</p>
				<p class="font-bold">Notifications: 2</p>
			</div>
			<div class="w-full md:w-1/2">
				<p class="font-bold">Ready for You to Proof: 4</p>
				<p class="font-bold">Returned for Your Attention: 3</p>
				<p class="font-bold">Under Negotiation/Conversion: 1</p>
			</div>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<div class="card p-4">
				<button class="">Track the progress of your submitted articles</button>
			</div>
			<div class="card p-4">Check the performance of your publications</div>
		</div>
	</div>
</section> -->
