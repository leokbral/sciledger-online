<script lang="ts">
	import type { Paper } from './types/Paper';
	import CorrectionProgressBar from '$lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	interface Props {
		papersData: Paper[];
		rota?: string;
		currentUser?: any;
		reviewAssignments?: any[];
	}

	let { papersData, rota = '/articles', currentUser, reviewAssignments }: Props = $props();
	let draftToDelete: Paper | null = $state(null);
	let isDeletingDraft = $state(false);
	let deleteDraftError = $state('');

	function getPaperTitle(paper: Paper | null) {
		const fallback = 'Untitled draft';
		if (!paper?.title) return fallback;
		if (typeof document === 'undefined') {
			return String(paper.title).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
		}

		const container = document.createElement('div');
		container.innerHTML = String(paper.title);
		return container.textContent?.replace(/\s+/g, ' ').trim() || fallback;
	}

	function requestDeleteDraft(paper: Paper) {
		draftToDelete = paper;
		deleteDraftError = '';
	}

	function cancelDeleteDraft() {
		if (isDeletingDraft) return;
		draftToDelete = null;
		deleteDraftError = '';
	}

	async function confirmDeleteDraft() {
		if (!draftToDelete || isDeletingDraft) return;

		isDeletingDraft = true;
		deleteDraftError = '';

		try {
			const response = await fetch(`/api/papers/${encodeURIComponent(draftToDelete.id)}`, {
				method: 'DELETE',
				headers: {
					Accept: 'application/json'
				}
			});
			const result = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(result.error || 'Unable to delete this draft. Please try again.');
			}

			const deletedId = draftToDelete.id;
			papersData = papersData.filter((paper) => paper.id !== deletedId);
			draftToDelete = null;
		} catch (error) {
			deleteDraftError =
				error instanceof Error ? error.message : 'Unable to delete this draft. Please try again.';
		} finally {
			isDeletingDraft = false;
		}
	}
	// let user; // Selecionar o primeiro usuário na lista para demonstração
</script>

<div class="container">
	<!-- Navbar -->

	<section class="">
		<dl class="list-dl">
			{#each papersData as paper}
				<div class="flex flex-col gap-2 mb-4">
					<div class="flex items-center gap-3 p-2 bg-gray-100 rounded-lg">
						<a
							data-sveltekit-reload
							href="{rota}/{paper.id}"
							class="flex min-w-0 flex-1 items-center space-x-4 hover:text-secondary-500"
						>
							<img src="/brand/logo/sciledger-symbol.svg" alt="Paper" class="w-8 h-8" />
							<span class="min-w-0 flex-auto">
								<dt class="font-bold">{@html paper.title}</dt>
								<p class="text-sm text-gray-600 capitalize">Status: {paper.status}</p>
							</span>
						</a>
						{#if paper.status === 'draft'}
							<button
								type="button"
								class="group inline-flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
								onclick={() => requestDeleteDraft(paper)}
								disabled={isDeletingDraft}
								aria-label={`Delete draft ${getPaperTitle(paper)}`}
								title="Delete draft"
							>
								<Trash2 class="size-4 transition-transform group-hover:scale-105" aria-hidden="true" />
							</button>
						{/if}
					</div>
					
					<!-- Barra de Progresso (apenas para papers em revisão ou correção) -->
					{#if paper.status === 'in review' || paper.status === 'needing corrections'}
						<div class="ml-4">
							<CorrectionProgressBar 
								{paper} 
								{currentUser} 
								showDetails={true} 
								size="md"
								{reviewAssignments}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</dl>
	</section>
</div>

{#if draftToDelete}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<button
			type="button"
			class="absolute inset-0 h-full w-full bg-black/50"
			onclick={cancelDeleteDraft}
			aria-label="Cancel draft deletion"
		></button>
		<div class="relative z-10 flex min-h-full items-center justify-center p-4">
			<div
				class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-draft-title"
			>
				<h2 id="delete-draft-title" class="text-xl font-bold text-gray-900">Delete draft?</h2>
				<p class="mt-3 text-sm text-gray-700">
					This will permanently delete "{getPaperTitle(draftToDelete)}". This action cannot be undone.
				</p>

				{#if deleteDraftError}
					<div class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{deleteDraftError}
					</div>
				{/if}

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						class="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={cancelDeleteDraft}
						disabled={isDeletingDraft}
					>
						Cancel
					</button>
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
						onclick={confirmDeleteDraft}
						disabled={isDeletingDraft}
					>
						<Trash2 class="size-4" aria-hidden="true" />
						{isDeletingDraft ? 'Deleting...' : 'Delete draft'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
