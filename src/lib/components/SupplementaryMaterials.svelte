<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { SupplementaryMaterial } from '$lib/types/PaperPublishStoreData';

	interface Props {
		materials?: SupplementaryMaterial[];
	}

	let { materials = [] }: Props = $props();

	const repositoryLabels: Record<string, string> = {
		github: 'GitHub',
		figshare: 'Figshare',
		zenodo: 'Zenodo',
		osf: 'OSF',
		dataverse: 'Dataverse',
		other: 'Repository'
	};

	const repositoryIcons: Record<string, string> = {
		github: 'mdi:github',
		figshare: 'simple-icons:figshare',
		zenodo: 'simple-icons:zenodo',
		osf: 'simple-icons:openscienceframework',
		dataverse: 'mdi:database-outline',
		other: 'mdi:link-variant'
	};
</script>

{#if materials && materials.length > 0}
	<section class="w-full mb-6">
		<div class="relative bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm rounded-2xl border border-surface-200/80 dark:border-surface-700 overflow-hidden shadow-[0_10px_35px_-18px_rgba(0,0,0,0.45)]">
			<!-- Header -->
			<div class="bg-gradient-to-r from-primary-50 via-white to-sky-50 dark:from-primary-900/20 dark:via-surface-900 dark:to-sky-900/20 px-6 py-5 border-b border-surface-200 dark:border-surface-700">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-white/80 dark:bg-surface-800 text-primary-700 dark:text-primary-300 flex items-center justify-center border border-primary-200 dark:border-primary-700 shadow-sm">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9A1.5 1.5 0 0119.5 18h-15A1.5 1.5 0 013 16.5v-9z" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h8" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
							Supplementary Materials
						</h3>
						<p class="text-sm text-surface-600 dark:text-surface-400">
							{materials.length} {materials.length === 1 ? 'resource' : 'resources'}
						</p>
					</div>
				</div>
			</div>

			<!-- Materials List -->
			<div class="divide-y divide-surface-200 dark:divide-surface-700">
				{#each materials as material (material.id)}
					<a
						href={material.url}
						target="_blank"
						rel="noopener noreferrer"
						class="block p-6 hover:bg-gradient-to-r hover:from-primary-50/60 hover:to-transparent dark:hover:from-primary-900/10 dark:hover:to-transparent transition-all duration-200 group"
					>
						<div class="flex items-start gap-4">
							<!-- Icon -->
							<div class="w-10 h-10 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 flex items-center justify-center flex-shrink-0 group-hover:border-primary-300 group-hover:text-primary-600 dark:group-hover:border-primary-700 dark:group-hover:text-primary-400 transition-colors">
								<Icon icon={repositoryIcons[material.type] || repositoryIcons.other} class="w-5 h-5" />
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-start justify-between gap-4 mb-2">
									<div>
										<h4 class="text-lg font-semibold text-surface-900 dark:text-surface-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors break-words tracking-tight">
											{material.title}
										</h4>
										<span class="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors border border-transparent group-hover:border-primary-200 dark:group-hover:border-primary-800">
											{repositoryLabels[material.type] || material.type}
										</span>
									</div>
									<!-- Arrow Icon -->
									<svg class="w-5 h-5 text-surface-400 dark:text-surface-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-shrink-0 mt-1 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 13.5v4.125a1.875 1.875 0 01-1.875 1.875H6.375A1.875 1.875 0 014.5 17.625V10.875A1.875 1.875 0 016.375 9H10.5" />
									</svg>
								</div>

								<!-- URL -->
								<p class="text-sm text-primary-600 dark:text-primary-400 font-mono break-all mb-2 group-hover:underline">
									{material.url}
								</p>

								<!-- Description -->
								{#if material.description}
									<p class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
										{material.description}
									</p>
								{/if}

								<!-- Metadata -->
								{#if material.createdAt}
									<p class="text-xs text-surface-500 dark:text-surface-500 mt-3">
										Added on {new Date(material.createdAt).toLocaleDateString()}
									</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>

			<!-- Footer Info -->
			<div class="px-6 py-4 bg-surface-50/80 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700">
				<p class="text-xs text-surface-600 dark:text-surface-400">
					Click on any material to open the public repository and access complementary resources.
				</p>
			</div>
		</div>
	</section>
{/if}
