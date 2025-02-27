<script lang="ts">
	export let data: any;

	export let pathname: string;
	const items = data.items;
	$: lastPathitem = pathname.split('/').pop();
</script>

<nav class="m-auto list-nav p-4">
	<ul class="m-auto p-10 flex flex-col justify-center items-center lg:gap-3 z-[2] md:ml-2">
		{#each items as item, i}
			<li>
				<a
					class:!variant-filled-primary={lastPathitem === item.name}
					class="w-56 px-8 py-3 m-1 text-xl chip rounded-lg font-Nunito font-bold uppercase card-hover variant-ghost-primary"
					href="./{item.name}"
					>{item.name === 'configuracoes' ? 'configurações' : item.name}
				</a>
			</li>
		{/each}
	</ul>
</nav>
