<script lang="ts">
	import type { ModalSettings /*, ModalComponent */ } from '@skeletonlabs/skeleton';
	import { getModalStore } from '@skeletonlabs/skeleton';

	const modalStore = getModalStore();

	export let modalData: any;
	export let component: string;
	export let title: string;

	function modalComponentFullscreen(): void {
		console.log("Chamou!")
		const modal: ModalSettings = {
			type: 'component',
			component /* : 'fullScreen' */,
			title /* : 'Full screen Modal' */,
			backdropClasses: '!p-0',
			meta: { modalData }
		};
		modalStore.trigger(modal);
	}
</script>

<button class="chip h-full w-full p-0" on:click={modalComponentFullscreen}><slot /></button>
