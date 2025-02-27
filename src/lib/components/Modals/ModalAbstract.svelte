<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import ModalFullscreen from './ModalFullscreen.svelte';
	import type { SvelteComponent } from 'svelte';

	
	export let parent: SvelteComponent;

	const modalStore = getModalStore();

	let data = $modalStore[0].meta.modalData.abstract;
	let classes = "bg-white justify-center"//$modalStore[0].meta.modalData.classes;
</script>

<ModalFullscreen {parent} cCustom="gap-2">
	<div class="{classes} w-8/12 h-2/6 md:p-2 flex flex-col md:flex-row mt-56 rounded">
		<!-- <div class="md:w-2/5 md:p-5"> -->
			<!-- <RadarAtributes {data} classes="min-h-[240px] md:min-h-[50svh]" /> -->{data}
		<!-- </div> -->
		<!-- <div class="ab m-auto md:w-1/2 md:h-[60svh] flex items-end justify-end"> -->
			<!-- <BarsAtributes {data} /> -->
		<!-- </div> -->
	</div>
</ModalFullscreen>
