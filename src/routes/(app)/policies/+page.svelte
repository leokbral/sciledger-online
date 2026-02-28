<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Policies & Standards - SciLedger</title>
</svelte:head>

<main class="max-w-7xl mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Policies & Standards</h1>
		<p class="text-lg text-gray-600">
			SciLedger is committed to maintaining the highest standards of research integrity, 
			publishing ethics, and transparency in scholarly communication.
		</p>
	</div>

	<!-- Policy Cards Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- Publishing Ethics -->
		<a href="/policies/publishing-ethics" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
						📜
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						Publishing Ethics
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Guidelines on research integrity, authorship, peer review ethics, and handling misconduct. 
					Learn about our commitment to ethical publishing practices.
				</p>
			</div>
		</a>

		<!-- Generative AI Policies -->
		<a href="/policies/generative-ai" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
						🤖
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						Generative AI Policies
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Policies regarding the use of artificial intelligence and large language models in research 
					and manuscript preparation. Transparency requirements and disclosure guidelines.
				</p>
			</div>
		</a>

		<!-- Author Statements -->
		<a href="/policies/author-statement" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
						✍️
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						CRediT Author Statement
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Guidelines for author contributions using the CRediT (Contributor Roles Taxonomy) system. 
					Learn how to properly attribute contributions in your manuscript.
				</p>
			</div>
		</a>

		<!-- Data Sharing -->
		<a href="/policies/data-sharing" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">
						💾
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						Data Sharing Policy
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Requirements and best practices for sharing research data, code, and materials. 
					Supporting open science and reproducibility.
				</p>
			</div>
		</a>

		<!-- Conflict of Interest -->
		<a href="/policies/conflict-of-interest" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
						⚠️
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						Conflict of Interest
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Guidelines for disclosing financial and non-financial conflicts of interest. 
					Ensuring transparency and maintaining trust in published research.
				</p>
			</div>
		</a>

		<!-- Open Access -->
		<a href="/policies/open-access" class="block group">
			<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow h-full border border-gray-200 hover:border-primary-500">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
						🔓
					</div>
					<h2 class="text-xl font-semibold text-gray-900 group-hover:text-primary-500">
						Open Access Policy
					</h2>
				</div>
				<p class="text-gray-600 text-sm leading-relaxed">
					Information about our open access publishing model, licensing options, 
					and making research freely available to the global community.
				</p>
			</div>
		</a>
	</div>

	<!-- Additional Information -->
	<div class="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
		<h3 class="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
		<p class="text-gray-700 mb-4">
			If you have questions about our policies or need clarification on any guidelines, 
			please don't hesitate to contact us.
		</p>
		<a href="/contact" class="text-primary-500 hover:text-primary-600 font-semibold">
			Contact Support →
		</a>
	</div>
</main>
