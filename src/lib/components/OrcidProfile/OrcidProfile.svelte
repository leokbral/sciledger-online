<script lang="ts">
	export let profile: any;

	const name = profile?.person?.name;
	const biography = profile?.person?.biography?.content;
	const orcidId = profile?.['orcid-identifier']?.path;
	const affiliations = profile?.['activities-summary']?.employments?.['affiliation-group'] ?? [];
	const country = profile?.person?.addresses?.address?.[0]?.country?.value;

	const works = profile?.['activities-summary']?.works?.group ?? [];

	function formatTitle(work: any) {
		const summary = work['work-summary']?.[0];
		const url = summary?.url?.value;
		const title = summary?.title?.title?.value ?? 'Sem título';
		return url
			? `<a href="${url}" target="_blank" rel="noopener" class="text-blue-600 underline">${title}</a>`
			: title;
	}

	const mainAffiliation = affiliations?.[0]?.['summaries']?.[0]?.['employment-summary'] ?? null;
</script>

<div class="bg-white shadow-md rounded-lg p-6 space-y-4 max-w-2xl mx-auto">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-2xl font-bold text-gray-800">
				{#if name}
					{name['given-names']?.value} {name['family-name']?.value}
				{/if}
			</h2>
			<p class="text-sm text-gray-500">
				<a
					href={`https://orcid.org/${orcidId}`}
					target="_blank"
					rel="noopener"
					class="underline hover:text-blue-600"
				>
					ORCID: {orcidId}
				</a>
			</p>
		</div>
		{#if country}
			<div class="mt-2 sm:mt-0 text-sm text-gray-600">🌍 {country}</div>
		{/if}
	</div>

	{#if mainAffiliation}
		<div class="text-gray-700">
			🏛️ <strong>Affiliation:</strong>
			{mainAffiliation?.organization?.name}
		</div>
	{/if}

	{#if biography}
		<div class="text-gray-600">
			✍️ <strong>Biography:</strong>
			<p class="mt-1 text-sm">{biography}</p>
		</div>
	{/if}

	{#if works.length > 0}
		<div>
			<h3 class="text-md font-semibold text-gray-800 mb-1">📚 Recent publications:</h3>
			<ul class="list-disc list-inside text-sm text-gray-700 space-y-1 max-h-40 overflow-y-auto">
				{@html works
					.slice(0, 5)
					.map(formatTitle)
					.map((title: any) => `<li>${title}</li>`)
					.join('')}
			</ul>
		</div>
	{/if}
</div>
