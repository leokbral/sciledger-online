<script>
	import { onMount } from 'svelte';

	/**
	 * @type {string | any[]}
	 */
	let hubs = [];

	onMount(async () => {
		// TODO: Replace with actual API call to fetch hubs
		hubs = [
			{ id: 1, name: 'Research Lab Hub', description: 'Main research laboratory hub' },
			{ id: 2, name: 'Chemistry Department', description: 'Chemistry research and experiments' }
		];
	});

	function createNewHub() {
		// TODO: Implement navigation to hub creation page or open modal
		console.log('Create new hub clicked');
	}
</script>

<div class="p-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-2xl font-bold">Research Hubs</h1>
		<a
			href="/hub/new"
			class="btn preset-filled-primary-500 text-white transition-colors duration-200"
			data-sveltekit-preload-data="hover"
			onclick={createNewHub}
		>
			Create New Hub
		</a>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
		{#if hubs.length === 0}
			<p class="text-gray-600">No hubs found. Create your first hub!</p>
		{:else}
			{#each hubs as hub}
				<a 
					href="/hub/{hub.id}/view" 
					class="block relative w-full h-54 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200"
					data-sveltekit-preload-data="hover"
				>
					<!-- Banner de fundo estático ou baseado no hub -->
					<img
						src="/placeholder-banner.jpg"
						alt="Hub Banner"
						class="absolute w-full h-full object-cover"
					/>

					<!-- Overlay escuro -->
					<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

					<!-- Conteúdo sobreposto -->
					<div class="absolute inset-0 p-4 flex flex-col justify-between text-white">
						<!-- Views e Members simulados -->
						<div class="flex items-center gap-4 text-sm">
							<div class="flex items-center gap-1">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/></svg
								>
								<span>29.2k</span>
							</div>
							<div class="flex items-center gap-1">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a4 4 0 00-5-4M9 20H4v-2a4 4 0 015-4m3-4a4 4 0 100-8 4 4 0 000 8zm6 4a4 4 0 10-8 0 4 4 0 008 0z"
									/></svg
								>
								<span>788</span>
							</div>
						</div>

						<!-- Nome e descrição -->
						<div>
							<h2 class="text-lg font-bold leading-tight">{hub.name}</h2>
							<p class="text-sm text-white/80">{hub.description}</p>
						</div>
					</div>
					</a>
			{/each}
		{/if}
	</div>
</div>
