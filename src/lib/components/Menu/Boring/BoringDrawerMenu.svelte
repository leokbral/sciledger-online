<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let item: any = {};

	const dispatch = createEventDispatcher();

	function hdlSelected() {
		dispatch('Item-selected');
	}
</script>

<div class="z-[10] card !bg-transparent text-xl flex flex-col gap-5">
	<!-- <header class="card-header flex justify-end">
		<button id="will-close" type="button" class="btn-icon">
			<img
				src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/x.svg"
				class=" brightness-0 invert"
				alt="close"
				width="28"
			/>
		</button>
	</header> -->
	<section class="text-white px-8 space-y-4">
		<article>
			<h2 class="h2 font-bold text-center">{@html item.description}</h2>
			<br />
			<p class=" text-center">
				{@html item.subtitle}
			</p>
		</article>
	</section>
	<footer class="card-footer p-4 flex justify-center items-center space-x-4">
		{#if item.notReady}
			<button
				on:click={hdlSelected}
				class="px-8 py-3 m-1 text-xl chip variant-filled-primary hover:bg-primary-800"
			>
				Em breve...
			</button>
		{:else}
			<a href="/{item.name}">
				<button
					on:click={hdlSelected}
					class="px-8 py-3 m-1 text-xl chip variant-filled-primary hover:bg-primary-800"
				>
					Iniciar
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/play.svg"
						class="m-2 mb-1 h-3 w-3"
						alt="Iniciar"
					/>
				</button>
			</a>
		{/if}
	</footer>
</div>
