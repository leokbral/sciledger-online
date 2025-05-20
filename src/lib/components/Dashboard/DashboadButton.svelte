<script lang="ts">
	// import type { ModalSettings /*, ModalComponent */ } from '@skeletonlabs/skeleton-svelte';
	// const modalStore = getModalStore();

	interface Props {
		modalData: any;
		component: string;
		title: string;
		children?: import('svelte').Snippet;
	}

	let {
		modalData,
		component,
		title,
		children
	}: Props = $props();

	// function modalComponentFullscreen(): void {
	// 	console.log("Chamou!")
	// 	const modal: ModalSettings = {
	// 		type: 'component',
	// 		component /* : 'fullScreen' */,
	// 		title /* : 'Full screen Modal' */,
	// 		backdropClasses: 'p-0!',
	// 		meta: { modalData }
	// 	};
	// 	modalStore.trigger(modal);
	// }
</script>

<button class="chip h-full w-full p-0" >{@render children?.()}</button>
<!-- <button class="chip h-full w-full p-0" onclick={modalComponentFullscreen}>{@render children?.()}</button> -->
