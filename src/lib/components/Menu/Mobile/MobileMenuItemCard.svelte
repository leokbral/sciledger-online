<script lang="ts">
	import type { Menuitem } from '../types';

	export let item: Menuitem;
	let description = item.description;
	let name = item.name;
</script>

<div
	class="mt-[40px] card rounded-3xl py-5 bg-gradient-to-br variant-gradient-primary-secondary card-hover w-11/12 md:w-1/2 flex flex-col items-center"
>
	<span id="outerRing">
		<a
			id="blink"
			href="/{name}"
			class="relative top-[-70px] mb-[-80px] btn-icon variant-filled w-24"
		>
			<span class="font-Valorant text-2xl chip rounded-3xl !bg-transparent hover:bg-primary-800">
				Go!
			</span>
		</a>
	</span>
	<header class="card-header">
		<section class="text-white p-4 space-y-4">
			<h1 class="h1 capitalize font-semibold" data-toc-ignore="">
				<span class="bg-surface-100 bg-clip-text text-transparent box-decoration-clone">{name}</span
				>
			</h1>
			<article>
				<p class="text-xl">
					{@html description}
				</p>
			</article>
		</section>
	</header>
</div>

<style>
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

	/* @keyframes ring {
		0% {
			width: 30px;
			height: 30px;
			opacity: 1;
		}
		100% {
			width: 300px;
			height: 300px;
			opacity: 0;
		}
	} */

	#blink {
		/* animation: blinking 3s infinite; */
		animation: ring 1s infinite;
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
