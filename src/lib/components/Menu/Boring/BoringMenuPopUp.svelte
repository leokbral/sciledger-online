<script lang="ts">
	interface Props {
		i: number;
		item?: any;
	}

	let { i, item = {} }: Props = $props();
</script>

<!-- <div class="card p-4 min-w-sm z-[10]" data-popup="boringMenu-{i}">
	<div class="grid grid-cols-1 gap-2 min-w-[160px]">
		<article>
			<p>
				{@html item.description}
			</p>
		</article>
		<button id="wont-close" class="btn variant-filled-error min-w-[128px]">#wont-close</button>
		<! -- <button id="will-close" class="btn variant-filled-success min-w-[128px]">#will-close</button> -- >
	</div>
	<div class="arrow bg-surface-100-800-token" />
</div> -->

<div
	class="z-[10] card bg-gradient-to-br from-primary-500 to-secondary-500 card-hover w-10/12 md:w-1/2"
	data-popup="boringMenu-{i}"
>
	<header class="card-header flex justify-end">
		<!-- <img
        src="https://images.unsplash.com/photo-1620562303747-ba21ca6f1530?ixid=M3w0Njc5ODF8MHwxfGFsbHx8fHx8fHx8fDE2ODc5NzY2MjR8&amp;ixlib=rb-4.0.3&amp;w=400&amp;h=175&amp;auto=format&amp;fit=crop"
        class="bg-black/50 w-full aspect-[21/9]"
        alt="Post"
    /> -->

		<button id="will-close" type="button" class="btn-icon">
			<img
				src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/x.svg"
				class=" brightness-0 invert"
				alt="close"
				width="28"
			/>
		</button>
	</header>
	<section class="text-white px-8 space-y-4">
		<article>
			<p>
				{@html item.description}
			</p>
		</article>
	</section>
	<footer class="card-footer p-4 flex justify-center items-center space-x-4">
		{#if item.notReady}
			<span class="px-8 py-3 m-1 text-xl chip preset-filled-primary-500 hover:bg-primary-800">
				Em breve...
			</span>
		{:else}
			<a href="/{item.name}">
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
