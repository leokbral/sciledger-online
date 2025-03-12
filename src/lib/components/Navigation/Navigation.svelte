<script lang="ts">

	interface Props {
		data: any;
		pathname: string;
	}

	let { data, pathname }: Props = $props();
	const items = data.items;
	let lastPathitem = $derived(pathname.split('/').pop());
</script>

<nav class="m-auto list-nav p-4">
	<ul class="m-auto p-10 flex flex-col justify-center items-center lg:gap-3 z-[2] md:ml-2">
		{#each items as item, i}
			<li>
				<a
					class:!preset-filled-primary-500={lastPathitem === item.name}
					class="w-56 px-8 py-3 m-1 text-xl chip rounded-lg font-Nunito font-bold uppercase card-hover preset-tonal-primary border border-primary-500"
					href="./{item.name}"
					>{item.name === 'configuracoes' ? 'configurações' : item.name}
				</a>
			</li>
		{/each}
	</ul>
</nav>
