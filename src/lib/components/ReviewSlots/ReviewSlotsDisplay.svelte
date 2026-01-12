<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		reviewSlots?: Array<{
			slotNumber: number;
			reviewerId: string | null;
			status: 'available' | 'pending' | 'occupied' | 'declined';
		}>;
		size?: 'sm' | 'md' | 'lg';
		showLegend?: boolean;
	}

	let { reviewSlots = [], size = 'md', showLegend = true }: Props = $props();

	// Calcular estatísticas
	let availableSlotsCount = $derived(
		reviewSlots.filter(slot => slot.status === 'available' || slot.status === 'declined').length
	);
	let occupiedSlotsCount = $derived(
		reviewSlots.filter(slot => slot.status === 'occupied').length
	);
	let pendingSlotsCount = $derived(
		reviewSlots.filter(slot => slot.status === 'pending').length
	);
	let maxSlots = $derived(reviewSlots.length || 3);

	// Tamanhos baseados na prop size
	const sizes = {
		sm: { height: 'h-8', icon: 'size-4', text: 'text-xs' },
		md: { height: 'h-10', icon: 'size-5', text: 'text-sm' },
		lg: { height: 'h-12', icon: 'size-6', text: 'text-base' }
	};

	let sizeClasses = $derived(sizes[size]);
</script>

<div class="review-slots-display">
	<div class="flex items-center justify-between mb-2">
		<h5 class="font-semibold text-surface-900 dark:text-surface-100 {sizeClasses.text}">
			Review Slots
		</h5>
		<span class="{sizeClasses.text} text-surface-600 dark:text-surface-400">
			{occupiedSlotsCount} / {maxSlots}
		</span>
	</div>

	<div class="flex gap-2 mb-2">
		{#each Array(maxSlots) as _, i}
			{@const slot = reviewSlots[i]}
			<div
				class="flex-1 {sizeClasses.height} rounded-lg border-2 flex items-center justify-center font-semibold {sizeClasses.text}
				{slot?.status === 'occupied'
					? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:text-green-200'
					: slot?.status === 'pending'
						? 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
						: 'bg-surface-100 border-surface-300 text-surface-500 dark:bg-surface-700 dark:border-surface-600'}"
			>
				{#if slot?.status === 'occupied'}
					<Icon icon="mdi:check-circle" class="{sizeClasses.icon} mr-1" />
					{#if size !== 'sm'}Slot {i + 1}{/if}
				{:else if slot?.status === 'pending'}
					<Icon icon="mdi:clock-outline" class="{sizeClasses.icon} mr-1" />
					{#if size !== 'sm'}Slot {i + 1}{/if}
				{:else}
					<Icon icon="mdi:checkbox-blank-circle-outline" class="{sizeClasses.icon} mr-1" />
					{#if size !== 'sm'}Slot {i + 1}{/if}
				{/if}
			</div>
		{/each}
	</div>

	{#if showLegend}
		<div class="flex gap-3 {sizeClasses.text} text-surface-600 dark:text-surface-400">
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 rounded-full bg-surface-300"></div>
				Available ({availableSlotsCount})
			</div>
			{#if pendingSlotsCount > 0}
				<div class="flex items-center gap-1">
					<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
					Pending ({pendingSlotsCount})
				</div>
			{/if}
			<div class="flex items-center gap-1">
				<div class="w-3 h-3 rounded-full bg-green-500"></div>
				Occupied ({occupiedSlotsCount})
			</div>
		</div>
	{/if}

	{#if availableSlotsCount === 0}
		<div
			class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded {sizeClasses.text} text-red-700 dark:text-red-300"
		>
			⚠️ All review slots are occupied
		</div>
	{/if}
</div>
