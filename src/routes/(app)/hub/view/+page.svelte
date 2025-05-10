<script lang="ts">
	// Simulação dos dados
	const hub = {
		name: '27th International Conference on Science, Technology and Innovation Indicators (STI 2023)',
		location: 'Leiden, The Netherlands',
		views: '55.99k',
		members: '1.27k',
		description: `The 27th International Conference on Science, Technology and Innovation Indicators, 2023, will be held September 27–29, 2023 in Leiden. The conference will be organised by CWTS in collaboration with the European Network of Indicator Developers (ENID). In this edition we intend to bring the best of physical and online meetings together at the Stadsgehoorzaal in downtown Leiden. This annual conference is traditionally held every four years in Leiden. The 2023 edition focuses on improving scholarly evaluation practices in the light of cultural change. Submissions should relate to contributing to more responsible, sustainable and transparent methods to assess academic work. The conference will be organized as a hybrid event. We therefore support both physical and online attendance including possibilities for remote presentations.`,
		link: 'https://www.sti2023.org/',
		image: '/banner-sti2023.jpg',
		logo: '/logo-sti2023.png'
	};
</script>

<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
	<!-- Banner -->
	<div class="w-full h-80 rounded-2xl overflow-hidden relative">
		<img src={hub.image} alt="Banner" class="w-full h-full object-cover" />
	</div>

	<!-- Info Card -->
	<div class="bg-white shadow-md rounded-xl p-6 flex flex-col md:flex-row gap-6">
		<!-- Logo -->
		<img src={hub.logo} alt="Logo" class="w-28 h-28 object-contain rounded-full" />

		<!-- Content -->
		<div class="flex-1 space-y-2">
			<h1 class="text-2xl font-semibold text-gray-900">{hub.name}</h1>

			<!-- Location, Views, Members -->
			<div class="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z" />
					</svg>
					<span>{hub.location}</span>
				</div>

				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
					</svg>
					<span>{hub.views} Views</span>
				</div>

				<div class="flex items-center gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-5-4m-8 6H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z" />
					</svg>
					<span>{hub.members} Members</span>
				</div>
			</div>

			<!-- Descrição -->
			<p class="text-gray-700 text-sm">{hub.description}</p>

			<!-- Link -->
			<a href={hub.link} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">{hub.link}</a>
		</div>

		<!-- Actions -->
		<div class="flex md:flex-col gap-2 justify-between items-end">
			<button class="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17l4-4-4-4m8 8l-4-4 4-4" />
				</svg>
				Acknowledgement
			</button>
		</div>
	</div>
</div>
