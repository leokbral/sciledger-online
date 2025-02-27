<script lang="ts">
	// let publishedArticles = 10;
	// let articlesInReview = 3;
	// let notifications = 2;
	// let readyForProofreading = 4;
	// let requiresAttention = 3;
	// let underNegotiation = 1;
	// let drafts = 5;
	// let pendingApproval = 2;
	// let upcomingDeadlines = 1;
	// let messages = 4;
	// let followers = 150;
	// let profileViews = 75;
	// let totalCitations = 120;
	// let averageReviewTime = 15; // in days
	// let acceptanceRate = 85; // in percentage
	// let impactFactor = 4.2;
	// let needingCorrections = 2;

	export let user; // Certifique-se de que o user está sendo passado para o componente
    export let publishedPapers; // Recebe os papers publicados passados do servidor

    console.log("Está sendo passado o user no AuthorDashboard", user);
    console.log("Papers publicados:", publishedPapers);

    let totalCitations = 0;
    let publishedArticles = 0;
    let averageReviewTime = 0;
    let highestScorePublication = { score: 0 };

    // Verifique se user e suas publicações estão definidos antes de usá-los
    if (user && publishedPapers) {
        // Calcular o total de citações
        totalCitations = publishedPapers.reduce((sum: number, paper: { citations: any[] }) => sum + (paper.citations.length || 0), 0);

        // Calcular o número de artigos publicados
        publishedArticles = publishedPapers.length;

        // Calcular o tempo médio de revisão (em dias)
        if (publishedPapers.length) {
            averageReviewTime = publishedPapers.reduce(
                (sum: number, paper: { reviewDate: string | number | Date; createdAt: string | number | Date }) =>
                    sum + (new Date(paper.reviewDate).getTime() - new Date(paper.createdAt).getTime()),
                0
            ) / publishedPapers.length / (1000 * 3600 * 24);
        }

        // Obter a publicação com a maior pontuação
        highestScorePublication = publishedPapers.reduce(
            (max: { score: number }, paper: { score: number }) => (paper.score > max.score ? paper : max),
            { score: 0 }
        );
    }
</script>

<section>
	<div class="p-6 bg-surface-100 mb-4 text-surface-900">
		<!-- <div class="text-xl font-bold mb-6">Your Activities</div> -->

		<!-- <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6"> -->
		<!-- <button> -->
		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{notifications}</p> -- >
			</div>
			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{messages}</p> -- >
			</div> -->
		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{articlesInReview}</p> -- >
			</div> -->

		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<g fill="none" stroke="currentColor" stroke-linejoin="round">
							<circle cx="12" cy="12" r="9" stroke-linecap="round" />
							<path stroke-width="1.5" d="M12 16h.01v.01H12z" />
							<path stroke-linecap="round" d="M12 12V8" />
						</g>
					</svg>
					Requires Your Attention
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{requiresAttention}
					</span>
				</p>
				<! -- <p class="text-ls">{requiresAttention}</p> -- >
			</div>

			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						class="relative"
					>
						<path
							fill="currentColor"
							d="m9.55 17.308l-4.97-4.97l.714-.713l4.256 4.256l9.156-9.156l.713.714z"
						/>
					</svg>
					<! -- Published Articles {publishedArticles} -- >
					Published Articles
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{publishedArticles}
					</span>
				</p>
			</div> -->

		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{drafts}</p> -- >
			</div>

			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{underNegotiation}</p> -- >
			</div>

			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
				<! -- <p class="text-ls">{upcomingDeadlines}</p> -- >
			</div>

			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer relative"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
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
						{needingCorrections}
					</span>
				</p>
			</div>

			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="m19.71 8.04l-2.34 2.33l-3.75-3.75l2.34-2.33c.39-.39 1.04-.39 1.41 0l2.34 2.34c.39.37.39 1.02 0 1.41M3 17.25L13.06 7.18l3.75 3.75L6.75 21H3zM16.62 5.04l-1.54 1.54l2.34 2.34l1.54-1.54zM15.36 11L13 8.64l-9 9.02V20h2.34z"
						/>
					</svg>
					Ready for Proofreading
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{readyForProofreading}
					</span>
				</p>
				<! -- <p class="text-ls">{readyForProofreading}</p> -- >
			</div> -->
		<!-- </button> -->
		<!-- <button> -->

		<!-- </button> -->
		<!-- <button> -->

		<!-- </button> -->
		<!-- <button> -->

		<!-- </button> -->
		<!-- <button> -->
		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M12.925 11.05L9.386 7.511l.714-.688l2.825 2.825l5.675-5.65l.689.688zm-6.521 7.604l7.565 2.207l5.989-1.85q-.03-.455-.276-.656q-.248-.201-.548-.201h-4.742q-.636 0-1.151-.05q-.516-.05-1.056-.238l-2.19-.718l.338-.988l2.025.732q.483.183 1.096.22q.613.036 1.68.042q0-.468-.171-.756t-.494-.402l-5.753-2.112q-.058-.019-.106-.028t-.106-.01h-2.1zm-4 2.346v-8.154h6.08q.137 0 .283.028q.147.028.277.078l5.779 2.117q.537.204.924.733q.388.529.388 1.352h3q.903 0 1.384.565q.481.566.481 1.435v.615l-6.98 2.154l-7.616-2.22V21zm1-1h2v-6.154h-2z"
						/>
					</svg>
					Pending Approval
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{pendingApproval}
					</span>
				</p>
				<! -- <p class="text-ls">{pendingApproval}</p> -- >
			</div> -->
		<!-- </button> -->
		<!-- <button> -->

		<!-- </button> -->
		<!-- <button> -->

		<!-- </button> -->
		<!-- <button> -->
		<!-- <div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M9.808 21V8.333Q8.06 7.994 6.863 6.7T5.358 3.652q-.031-.177.115-.318t.335-.142q.208 0 .354.126t.196.328q.333 1.646 1.569 2.712q1.237 1.065 2.823 1.065h2.5q.577 0 .977.17t.81.578l3.882 3.883q.14.14.15.344t-.15.364t-.353.16q-.195 0-.354-.16l-4.02-4.02V21q0 .214-.143.357t-.357.143t-.356-.143t-.144-.357v-5.384h-2.384V21q0 .214-.143.357t-.357.143t-.357-.143T9.808 21M12 5.77q-.71 0-1.201-.492t-.491-1.201t.491-1.201T12 2.385t1.201.491t.491 1.201t-.491 1.201q-.492.491-1.201.491"
						/>
					</svg>
					Followers
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{followers}
					</span>
				</p>
				<! -- <p class="text-ls">{followers}</p> -- >
			</div>
			<! -- </button> -- >
			<! -- <button> -- >
			<div class="relative">
				<p
					class="text-ls font-semibold flex items-center gap-2 text-gray-700 hover:text-blue-600 hover:underline transition duration-300 ease-in-out cursor-pointer"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="2.5em"
						height="2.5em"
						viewBox="0 0 24 24"
						{...$$props}
					>
						<path
							fill="currentColor"
							d="M6.23 22H3.617q-.691 0-1.153-.462T2 20.385v-2.616h1v2.616q0 .269.173.442t.443.173H6.23zm11.54 0v-1h2.615q.269 0 .442-.173t.173-.442v-2.616h1v2.616q0 .69-.462 1.152T20.385 22zM12 17.73q-2.673 0-4.803-1.514Q5.067 14.7 3.981 12q1.086-2.7 3.216-4.216Q9.327 6.27 12 6.27t4.803 1.515T20.019 12q-1.086 2.7-3.216 4.216Q14.673 17.73 12 17.73m0-1q2.277 0 4.083-1.239T18.92 12q-1.032-2.254-2.838-3.492T12 7.269T7.917 8.508T5.08 12q1.033 2.254 2.838 3.492T12 16.731m0-1.866q1.2 0 2.033-.832T14.866 12t-.833-2.033T12 9.135t-2.033.832T9.135 12t.832 2.033t2.033.833m0-1q-.779 0-1.322-.544q-.543-.543-.543-1.322t.543-1.322T12 10.135t1.322.543q.544.543.544 1.322t-.544 1.322q-.543.544-1.322.544M2 6.23V3.616q0-.691.463-1.153T3.616 2H6.23v1H3.616q-.27 0-.443.173T3 3.616V6.23zm19 0V3.616q0-.27-.173-.443T20.385 3h-2.616V2h2.616q.69 0 1.152.463T22 3.616V6.23zM12 12"
						/>
					</svg>
					Profile Views
					<span
						class="absolute top-0 left-1/4 -translate-x-8 -translate-y-1 bg-primary-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full"
					>
						{profileViews}
					</span>
				</p>
				<! -- <p class="text-ls">{profileViews}</p> -- >
			</div> -->
		<!-- </button> -->
		<!-- </div> -->

		<!-- <div class="text-2xl font-bold mb-4">Quick Actions</div>
		<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
			<button class="bg-primary-500 text-white p-4 rounded-full shadow hover:bg-primary-600"
				>Submit a New Article</button
			>
			<button class="bg-primary-500 text-white p-4 rounded-full shadow hover:bg-primary-600"
				>View All Notifications</button
			>
			<button class="bg-primary-500 text-white p-4 rounded-full shadow hover:bg-primary-600"
				>Manage Followers</button
			>
		</div> -->

		<div class="text-2xl font-bold mb-4 text-surface-900">Stats Overview</div>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Total Publications</p>
				<p class="text-2xl">{publishedArticles}</p>
			</div>
			<div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Total Citations</p>
				<p class="text-2xl">{totalCitations}</p>
			</div>
			<div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Average Review Time (days)</p>
				<p class="text-2xl">{averageReviewTime.toFixed()}</p>
			</div>
			<div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Highest Score Publication</p>
				<p class="text-2xl">{highestScorePublication.title || 'N/A'}</p>
			</div>
		</div>
		<!-- <div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Acceptance Rate (%)</p>
				<p class="text-2xl">{acceptanceRate}</p>
			</div>
			<div class="bg-white p-4 shadow rounded text-surface-900">
				<p class="text-lg font-semibold">Impact Factor</p>
				<p class="text-2xl">{impactFactor}</p>
			</div> -->
	</div>
</section>

<!-- <section>
	<div class="bg-white shadow-md rounded p-6 mb-8">
		<h3 class="text-xl font-bold mb-4">Your Research</h3>
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
