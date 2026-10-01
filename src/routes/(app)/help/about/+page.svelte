<svelte:head>
	<title>About SciLedger | SciLedger Help</title>
	<meta
		name="description"
		content="What SciLedger is, why it exists, how the editorial process works, and why to publish here."
	/>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<div>
		<a href="/help" class="text-sm font-medium text-primary-700 hover:text-primary-800">
			Back to Help
		</a>
		<h1 class="mt-3 text-3xl font-bold text-gray-900">About SciLedger</h1>
		<p class="mt-2 text-gray-600">
			What the platform is, why it exists, how the editorial process works, and why publish here.
		</p>
	</div>

	<nav aria-label="On this page" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
		<p class="text-sm font-semibold text-gray-800">On this page</p>
		<ul class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
			<li>
				<a href="#what-is-sciledger" class="font-medium text-primary-700 hover:text-primary-800">
					What is SciLedger?
				</a>
			</li>
			<li>
				<a href="#why-we-built-it" class="font-medium text-primary-700 hover:text-primary-800">
					Why we built it
				</a>
			</li>
			<li>
				<a href="#how-it-works" class="font-medium text-primary-700 hover:text-primary-800">
					How it works
				</a>
			</li>
			<li>
				<a href="#why-publish-here" class="font-medium text-primary-700 hover:text-primary-800">
					Why publish here
				</a>
			</li>
		</ul>
	</nav>

	<section
		id="what-is-sciledger"
		class="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h2 class="text-xl font-semibold text-gray-900">What is SciLedger?</h2>
		<p class="mt-3 leading-7 text-gray-700">
			SciLedger is an online platform for scientific publication and peer review. Submission,
			reviewer assignment, review and publication all happen in one place, so a manuscript never
			leaves the system to travel through email threads and spreadsheets between stages.
		</p>
		<p class="mt-4 leading-7 text-gray-700">
			Authors sign in with ORCID, which ties every submission and every review to a verified
			academic identity. Research communities can organise their own work into hubs, each with its
			own administrators, while papers submitted without a hub follow the platform's standard
			editorial route.
		</p>
		<div class="mt-5 grid gap-3 sm:grid-cols-3">
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">Submit</p>
				<p class="mt-1 text-sm text-gray-600">
					Upload a manuscript, declare authors and affiliations, and pick a knowledge area.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">Review</p>
				<p class="mt-1 text-sm text-gray-600">
					Up to three reviewers accept an invitation and work through a structured review.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">Publish</p>
				<p class="mt-1 text-sm text-gray-600">
					Accepted manuscripts are published with their editorial record intact.
				</p>
			</div>
		</div>
	</section>

	<section
		id="why-we-built-it"
		class="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h2 class="text-xl font-semibold text-gray-900">Why we built it</h2>
		<p class="mt-3 leading-7 text-gray-700">
			Conventional publishing leaves authors waiting without knowing what is happening. A manuscript
			is submitted, months pass, and the only signal is silence — whether the delay came from
			finding reviewers, from reviewers who accepted and never returned, or from an editor's queue
			is invisible from the outside.
		</p>
		<p class="mt-4 leading-7 text-gray-700">
			Peer review carries the same problem from the other side. Reviewing is unpaid, largely
			invisible work, and the people doing it carry no record of having done it. When reviewers are
			hard to find, the cost lands on the author as an open-ended wait.
		</p>
		<p class="mt-4 leading-7 text-gray-700">
			SciLedger was built to make that process legible. Each stage of a submission has an explicit
			state that authors can see, reviewer commitment is tracked rather than assumed, and what
			authors pay for is tied to reviewers actually taking the work on.
		</p>
	</section>

	<section
		id="how-it-works"
		class="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h2 class="text-xl font-semibold text-gray-900">How it works</h2>
		<p class="mt-3 leading-7 text-gray-700">
			The editorial process moves through four stages. A manuscript's current stage is always
			visible from your dashboard.
		</p>

		<ol class="mt-5 space-y-4">
			<li class="flex gap-4">
				<span
					class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
				>
					1
				</span>
				<div>
					<p class="font-semibold text-gray-900">Submission</p>
					<p class="mt-1 leading-7 text-gray-700">
						You upload the manuscript, declare the author list with affiliations and corresponding
						authors, and choose a knowledge area. The submission can be routed to a hub or follow
						the standard route without one.
					</p>
				</div>
			</li>
			<li class="flex gap-4">
				<span
					class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
				>
					2
				</span>
				<div>
					<p class="font-semibold text-gray-900">Reviewer assignment</p>
					<p class="mt-1 leading-7 text-gray-700">
						Every paper has three review slots. Invitations are sent against the slots that are
						still open, and a slot is only held once a reviewer accepts. A declined invitation
						releases its slot so it can be offered to someone else.
					</p>
				</div>
			</li>
			<li class="flex gap-4">
				<span
					class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
				>
					3
				</span>
				<div>
					<p class="font-semibold text-gray-900">Review</p>
					<p class="mt-1 leading-7 text-gray-700">
						The three reviewers work through the manuscript and submit their assessments. Authors
						are notified as the review progresses and respond to the points raised.
					</p>
				</div>
			</li>
			<li class="flex gap-4">
				<span
					class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white"
				>
					4
				</span>
				<div>
					<p class="font-semibold text-gray-900">Decision and publication</p>
					<p class="mt-1 leading-7 text-gray-700">
						An accepted manuscript is published on the platform. If you decide not to proceed, the
						withdrawal policy that applies depends on whether the manuscript is still in review or
						has already been accepted.
					</p>
				</div>
			</li>
		</ol>

		<div class="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
			<h3 class="text-lg font-semibold text-blue-900">Payment rule</h3>
			<p class="mt-2 leading-7 text-blue-900">
				Payment capture is executed only when 3 reviewers accept the review invitation. Until that
				happens, nothing is charged.
			</p>
		</div>

		<div class="mt-5 grid gap-3 sm:grid-cols-2">
			<a
				href="/help/how-to-submit"
				class="block rounded-lg border border-gray-200 p-4 transition hover:border-primary-400 hover:shadow-sm"
			>
				<p class="font-semibold text-gray-900">How to Submit</p>
				<p class="mt-1 text-sm text-gray-600">
					The step-by-step submission guide, with the withdrawal policies.
				</p>
			</a>
			<a
				href="/policies"
				class="block rounded-lg border border-gray-200 p-4 transition hover:border-primary-400 hover:shadow-sm"
			>
				<p class="font-semibold text-gray-900">Editorial policies</p>
				<p class="mt-1 text-sm text-gray-600">
					Publishing ethics, open access, conflict of interest, data sharing and generative AI.
				</p>
			</a>
		</div>
	</section>

	<section
		id="why-publish-here"
		class="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h2 class="text-xl font-semibold text-gray-900">Why publish here</h2>
		<p class="mt-3 leading-7 text-gray-700">
			The case for SciLedger comes down to four things you can check for yourself.
		</p>
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">You can see where your paper stands</p>
				<p class="mt-1 text-sm leading-6 text-gray-600">
					Review slots, invitations and reviewer acceptances are all visible. A wait has a reason
					attached to it.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">You pay for review that is happening</p>
				<p class="mt-1 text-sm leading-6 text-gray-600">
					Nothing is captured until three reviewers have accepted, so you are never charged for a
					stalled search.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">Verified academic identity</p>
				<p class="mt-1 text-sm leading-6 text-gray-600">
					ORCID sign-in ties authorship and review work to real, verifiable researchers.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4">
				<p class="font-semibold text-gray-900">Policies written down in advance</p>
				<p class="mt-1 text-sm leading-6 text-gray-600">
					Ethics, authorship, data sharing, generative AI and withdrawal rules are published before
					you submit, not decided case by case.
				</p>
			</div>
		</div>
	</section>

	<div class="flex flex-wrap gap-3">
		<a href="/publish/new" class="btn preset-filled-primary-500">Submit an article</a>
		<a href="/help/how-to-submit" class="btn preset-outlined">Read the submission guide</a>
		<a href="/help" class="btn preset-outlined">Back to Help</a>
	</div>
</div>
