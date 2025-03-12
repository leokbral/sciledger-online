<script lang="ts">
	import type { Menuitem } from './types';

	interface Props {
		selected: number;
		items: Menuitem[];
	}

	let { selected, items }: Props = $props();
</script>

<!-- <div class="border-solid variant-soft card">
	<p class="text-9xl"><!-- {items[selected].icon} -- ></p>
	<br />
	<a href="/{items[selected].name}">
		<span class="px-8 py-3 m-1 text-xl chip variant-filled hover:bg-primary-400"> Iniciar ▶️ </span>
	</a>
</div> -->

<div class=" card bg-linear-to-br from-primary-500 to-secondary-500 card-hover w-10/12 md:w-1/2">
	<header class="card-header">
		<!-- <img
			src="https://images.unsplash.com/photo-1620562303747-ba21ca6f1530?ixid=M3w0Njc5ODF8MHwxfGFsbHx8fHx8fHx8fDE2ODc5NzY2MjR8&amp;ixlib=rb-4.0.3&amp;w=400&amp;h=175&amp;auto=format&amp;fit=crop"
			class="bg-black/50 w-full aspect-21/9"
			alt="Post"
		/> -->
		<section class="text-white p-4 space-y-4">
			<!-- <h6 class="h6" data-toc-ignore="">Announcements</h6> -->
			<h3 class="h3 capitalize" data-toc-ignore="">{items[selected].name}</h3>
			<article>
				<p>
					{@html items[selected].description}
				</p>
			</article>
		</section>
	</header>
	<footer class="card-footer p-4 flex justify-center items-center space-x-4">
		{#if items[selected].notReady}
			<span class="px-8 py-3 m-1 text-xl chip preset-filled-primary-500 hover:bg-primary-800">
				Em breve...
			</span>
		{:else}
			<a href="/{items[selected].name}">
				<span class="px-8 py-3 m-1 text-xl chip preset-filled-primary-500 hover:bg-primary-800">
					Iniciar <!-- ▶️ -->
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/play.svg"
						class="m-2 mb-1 h-3 w-3"
						alt="Iniciar"
					/>
				</span>
			</a>
		{/if}
	</footer>
</div>
