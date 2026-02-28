<svelte:head>
	<title>Data Sharing Policy - SciLedger</title>
</svelte:head>

<main class="max-w-4xl mx-auto px-4 py-8">
	<nav class="mb-6">
		<a href="/policies" class="text-primary-500 hover:text-primary-600">
			← Back to Policies
		</a>
	</nav>

	<article class="prose prose-lg max-w-none">
		<h1 class="text-4xl font-bold text-gray-900 mb-4">Data Sharing Policy</h1>
		
		<div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
			<p class="text-gray-700">
				SciLedger is committed to promoting open science and research transparency through 
				appropriate data sharing practices.
			</p>
		</div>

		<section class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">Data Availability Requirements</h2>
			<p class="text-gray-700 mb-4">
				Authors are required to include a Data Availability Statement in all research articles, specifying:
			</p>
			<ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
				<li>Where the data supporting the findings can be accessed</li>
				<li>Any restrictions on data availability</li>
				<li>How others can access or request the data</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">Types of Research Data</h2>
			<p class="text-gray-700 mb-4">
				Research data may include:
			</p>
			<ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
				<li>Raw and processed data files</li>
				<li>Software code and scripts</li>
				<li>Algorithms and computational methods</li>
				<li>Research materials and protocols</li>
				<li>Analysis workflows</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">Recommended Repositories</h2>
			<p class="text-gray-700 mb-4">
				Authors should deposit data in recognized, publicly accessible repositories:
			</p>
			<ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
				<li><strong>General:</strong> Zenodo, Figshare, Dryad, OSF</li>
				<li><strong>Life Sciences:</strong> GenBank, PDB, ArrayExpress</li>
				<li><strong>Social Sciences:</strong> ICPSR, UK Data Service</li>
				<li><strong>Code:</strong> GitHub, GitLab, Bitbucket</li>
			</ul>
		</section>

		<section class="mb-8">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">Acceptable Restrictions</h2>
			<p class="text-gray-700 mb-4">
				Data sharing restrictions are acceptable in the following cases:
			</p>
			<ul class="list-disc list-inside space-y-2 text-gray-700 ml-4">
				<li>Ethical or legal constraints (e.g., human subject privacy)</li>
				<li>Commercial or proprietary restrictions</li>
				<li>National security concerns</li>
				<li>Third-party data with access restrictions</li>
			</ul>
			<p class="text-gray-700 mt-4">
				Authors must clearly explain any restrictions and how access can be requested.
			</p>
		</section>

		<div class="bg-green-50 border border-green-200 rounded-lg p-4 mt-8">
			<h3 class="font-semibold text-gray-900 mb-2">Example Data Availability Statements</h3>
			<div class="space-y-4 mt-4">
				<div>
					<p class="text-sm font-semibold text-gray-800 mb-1">Publicly Available:</p>
					<p class="text-sm text-gray-700 italic">
						"The data supporting the findings of this study are openly available in [repository name] at [DOI/URL]."
					</p>
				</div>
				<div>
					<p class="text-sm font-semibold text-gray-800 mb-1">Available on Request:</p>
					<p class="text-sm text-gray-700 italic">
						"The data that support the findings of this study are available from the corresponding author upon reasonable request."
					</p>
				</div>
				<div>
					<p class="text-sm font-semibold text-gray-800 mb-1">Restricted Access:</p>
					<p class="text-sm text-gray-700 italic">
						"The data are not publicly available due to [privacy/ethical restrictions]. Access can be requested through [institution/ethics committee]."
					</p>
				</div>
			</div>
		</div>
	</article>
</main>
