<script lang="ts">
	import type { Menuitem } from '../types';
	interface Props {
		item: Menuitem;
	}

	let { item }: Props = $props();
	let description = item.description;
	let name = item.name;
</script>

<a id="blink" href="/{name}" class="relative top-[-70px] mb-[-80px] btn-icon preset-filled w-24">
	<span class="font-Valorant text-2xl chip rounded-3xl !bg-transparent hover:bg-primary-800">
		Go!
	</span>
</a>

<style>
	#blink {
		/* animation: blinking 3s infinite; */
		animation: ring 1s infinite;
	}

	@keyframes blinking {
		0% {
			background-color: #070033;
			/* color: #fae5ff; */
		}
		50% {
			background-color: #fae5ff;
			/* color: #070033; */
		}
		100% {
			background-color: #070033;
			/* color: #fae5ff; */
		}
	}

	@keyframes ring {
		0% {
			outline: 4px solid #3e0678;
		}
		20% {
			outline: 6px solid #3e0678;
		}
		40% {
			outline: 8px solid #3e0678;
		}
		60% {
			outline: 8px solid #3e0678;
		}
		80% {
			outline: 6px solid #3e0678;
		}
		100% {
			outline: 4px solid #3e0678;
		}
	}
</style>
