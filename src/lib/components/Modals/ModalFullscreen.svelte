<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	// Stores
	import { getModalStore } from '@skeletonlabs/skeleton';

	// Props
	/** Exposes parent props to this component. */
	export let parent: SvelteComponent;

	export let cCustom: string = '';

	const modalStore = getModalStore();

	// Notes: Use `w-screen h-screen` to fit the visible canvas size.
	const cBase =
		'bg-surface-100-800-token w-screen h-[calc(100svh_-_32px)] gap-4 p-4 grid grid-rows-[auto_1fr] justify-center items-center';
</script>

{#if $modalStore[0]}
	<div class="modal-example-fullscreen {cBase} {cCustom}">
		<div class="w-[calc(100svw_-_64px)] flex justify-between">
			<span class="px-2 text-3xl font-Nunito">{$modalStore[0].title}</span>
			<button class="btn-icon btn-icon-md variant-ghost-primary" on:click={parent.onClose}>
				<span>
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/x.svg"
						class=" brightness-0 invert"
						alt="close"
						width="28"
						height="28"
					/>
				</span>
				<!-- Fechar -->
			</button>
		</div>
		<div class="flex flex-col items-center space-y-4 h-full">
			<!-- <h2 class="h2">Full Screen Modal</h2>
			<p>This demonstrates a full screen modal dialog.</p> -->
			<!-- {JSON.stringify($modalStore[0].meta)} -->
			<!-- {@html $modalStore[0].meta.modalData} -->
			<slot />
		</div>
	</div>
{/if}

<!-- <style>
	* {
		outline: solid red;
	}
</style> -->
