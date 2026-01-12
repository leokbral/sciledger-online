<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import Icon from '@iconify/svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { User } from '$lib/types/User';

	interface Props {
		paperId: string;
		reviewer: User;
		currentDeadline?: Date;
		reviewAssignmentId?: string;
	}

	let { paperId, reviewer, currentDeadline, reviewAssignmentId }: Props = $props();

	let openModal = $state(false);
	let newDeadlineDays = $state(15);
	let loading = $state(false);

	// Calcular dias restantes se houver deadline atual
	let daysRemaining = $derived(() => {
		if (!currentDeadline) return null;
		const now = new Date();
		const deadline = new Date(currentDeadline);
		const diff = deadline.getTime() - now.getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	});

	async function updateDeadline() {
		if (newDeadlineDays < 1) {
			toaster.warning({ title: 'Invalid deadline', description: 'Deadline must be at least 1 day' });
			return;
		}

		const payload = {
			reviewAssignmentId,
			paperId,
			reviewerId: reviewer.id || reviewer._id,
			newDeadlineDays
		};

		console.log('🚀 FRONTEND: Sending update deadline request');
		console.log('🔄 Updating deadline with params:', payload);
		console.log('📦 Reviewer object:', reviewer);
		console.log('📝 Current deadline:', currentDeadline);

		loading = true;
		try {
			console.log('📡 Making fetch request to /api/review-assignments/update-deadline');
			const response = await fetch('/api/review-assignments/update-deadline', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			console.log('📥 Response status:', response.status);
			const data = await response.json();
			console.log('📥 Response data:', data);

			if (response.ok) {
				console.log('✅ SUCCESS: Deadline updated');
				toaster.success({ 
					title: 'Deadline updated', 
					description: `New deadline set to ${newDeadlineDays} days from now` 
				});
				openModal = false;
				window.location.reload();
			} else {
				console.error('❌ ERROR:', data.error);
				toaster.error({ title: 'Error', description: data.error || 'Failed to update deadline' });
			}
		} catch (error) {
			console.error('❌ EXCEPTION:', error);
			toaster.error({ title: 'Error', description: 'An error occurred while updating the deadline' });
		} finally {
			loading = false;
		}
	}
</script>

<button
	class="btn btn-sm preset-tonal"
	onclick={() => (openModal = true)}
	title="Manage review deadline"
>
	<Icon icon="mdi:calendar-clock" class="size-4" />
	Manage Deadline
</button>

<Modal open={openModal} onOpenChange={(e) => (openModal = e.open)}>
   {#snippet trigger()}
	   <span></span>
   {/snippet}

   {#snippet content()}
	   <div class="p-0 md:p-0 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950 border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
		   <div class="px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
			   <Icon icon="mdi:calendar-clock" class="size-7 text-primary-500" />
			   <h3 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Manage Review Deadline</h3>
		   </div>
		   <div class="px-8 pt-6 pb-2">
			   <div class="mb-5 flex items-center gap-4">
				   {#if reviewer.profilePictureUrl}
					   <img src={reviewer.profilePictureUrl} alt={reviewer.firstName} class="w-12 h-12 rounded-full shadow border-2 border-primary-200 dark:border-primary-700" />
				   {:else}
					   <div class="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold shadow">
						   {reviewer.firstName[0]}{reviewer.lastName[0]}
					   </div>
				   {/if}
				   <div>
					   <div class="font-semibold text-lg text-slate-900 dark:text-white">{reviewer.firstName} {reviewer.lastName}</div>
					   <div class="text-xs text-slate-500 dark:text-slate-400">{reviewer.email}</div>
				   </div>
			   </div>

			   {#if currentDeadline}
				   <div class="mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-100/80 to-blue-200/60 dark:from-blue-900/40 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 flex flex-col gap-1">
					   <div class="text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wide">Current Deadline</div>
					   <div class="text-lg font-bold text-blue-900 dark:text-blue-100">{new Date(currentDeadline).toLocaleDateString()}</div>
					   {#if daysRemaining() !== null}
						   <div class="text-xs text-blue-700 dark:text-blue-200">
							   {daysRemaining() > 0 
								   ? `${daysRemaining()} days remaining` 
								   : `${Math.abs(daysRemaining())} days overdue`}
						   </div>
					   {/if}
				   </div>
			   {/if}

			   <div class="mb-7">
				   <label class="block mb-2">
					   <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">New Deadline (days from now)</span>
					   <span class="block text-xs text-slate-500 dark:text-slate-400 mb-2">Set the number of days from today for the new deadline</span>
					   <div class="flex items-center gap-3">
						   <input
							   type="number"
							   bind:value={newDeadlineDays}
							   min="1"
							   max="90"
							   class="input w-24 text-center rounded-lg border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:border-primary-400 dark:focus:ring-primary-900 transition-all shadow-sm text-lg font-semibold"
							   placeholder="15"
						   />
						   <span class="text-sm text-slate-500 dark:text-slate-400">days from now</span>
					   </div>
					   <span class="block text-xs text-slate-400 mt-2">New deadline: <span class="font-semibold text-slate-700 dark:text-slate-200">{new Date(Date.now() + newDeadlineDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</span></span>
				   </label>
			   </div>
		   </div>
		   <div class="px-8 pb-8 pt-2 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-gradient-to-t from-slate-100/60 to-transparent dark:from-slate-900/40">
			   <button class="btn btn-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 hover:dark:bg-slate-800 transition-all shadow-sm" onclick={() => (openModal = false)}>
				   Cancel
			   </button>
			   <button
				   class="btn btn-md rounded-lg bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold shadow hover:from-primary-600 hover:to-blue-600 transition-all flex items-center gap-2 px-5"
				   onclick={updateDeadline}
				   disabled={loading}
			   >
				   {#if loading}
					   <Icon icon="eos-icons:loading" class="size-5 animate-spin" />
					   Updating...
				   {:else}
					   <Icon icon="mdi:check" class="size-5" />
					   Update Deadline
				   {/if}
			   </button>
		   </div>
	   </div>
   {/snippet}
</Modal>
