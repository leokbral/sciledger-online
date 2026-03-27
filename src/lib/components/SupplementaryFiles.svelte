<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { SupplementaryFile } from '$lib/types/PaperPublishStoreData';

	interface Props {
		files?: SupplementaryFile[];
		allowDownload?: boolean;
		title?: string;
	}

	const { files = [], allowDownload = true, title = '📎 Supplementary Files' }: Props = $props();

	// Get appropriate icons for different file types
	function getFileIcon(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'mdi:image';
		if (mimeType.includes('pdf')) return 'mdi:file-pdf-box';
		if (mimeType.includes('word') || mimeType.includes('document')) return 'mdi:file-document';
		if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'mdi:file-excel';
		if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('gzip'))
			return 'mdi:folder-zip';
		if (mimeType.includes('text') || mimeType.includes('csv')) return 'mdi:file-text';
		return 'mdi:file';
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function downloadFile(file: SupplementaryFile) {
		if (!file.fileId) return;
		const url = `/api/supplementary-materials/download?id=${encodeURIComponent(file.fileId)}`;
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', file.filename || 'download');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

{#if files && files.length > 0}
	<section class="w-full bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm border border-surface-200/80 dark:border-surface-700 rounded-2xl p-5 mb-6 shadow-[0_10px_35px_-20px_rgba(0,0,0,0.45)]">
		<div class="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700">
			<h3 class="text-xl font-semibold text-surface-900 dark:text-surface-100 tracking-tight">
				{title}
			</h3>
			<p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
				Download supporting files and materials related to this paper.
			</p>
		</div>

		<div class="space-y-3">
			{#each files as file}
				<div
					class="bg-gradient-to-r from-surface-50 to-white dark:from-surface-800 dark:to-surface-800/80 border border-surface-200 dark:border-surface-700 rounded-xl p-4 group hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200"
				>
					<div class="flex justify-between items-start gap-4">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-3 mb-2">
								<div
									class="w-10 h-10 rounded-lg border border-surface-300 dark:border-surface-600 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0"
								>
									<Icon icon={getFileIcon(file.mimeType)} class="w-5 h-5" />
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="font-semibold text-surface-900 dark:text-surface-100 tracking-tight truncate">
										{file.title}
									</h4>
									<p class="text-xs text-surface-500 dark:text-surface-400 font-mono truncate">
										{file.filename}
									</p>
								</div>
							</div>

							{#if file.description}
								<p class="text-sm text-surface-600 dark:text-surface-400 mt-2 leading-relaxed">
									{file.description}
								</p>
							{/if}

							<div class="flex items-center gap-2 mt-2 text-xs text-surface-500 dark:text-surface-400">
								<span class="px-2 py-1 bg-surface-100 dark:bg-surface-800 rounded-md">
									{formatFileSize(file.fileSize)}
								</span>
								{#if file.createdAt}
									<span>
										Added {new Date(file.createdAt).toLocaleDateString(undefined, {
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</span>
								{/if}
							</div>
						</div>

						{#if allowDownload && file.fileId}
							<button
								type="button"
								onclick={() => downloadFile(file)}
								class="px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 flex-shrink-0 whitespace-nowrap"
								title="Download file"
								aria-label="Download file"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
								</svg>
								Download
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<p class="mt-4 text-xs text-surface-500 dark:text-surface-400">
			💡 These supplementary materials are directly available for download. Each file is limited to 10MB.
		</p>
	</section>
{/if}
