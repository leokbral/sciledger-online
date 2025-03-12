<script lang="ts">
	interface Props {
		profile: any;
	}

	let { profile }: Props = $props();
	let name: string = profile.name;
	let belt: string = profile.belt;
	let src: string = profile.picture;
	let alt: string = 'meta';
</script>

<div class="mt-[85 px] m-auto card bg-white! text-surface-800 card-hover overflow-hidden">
	<header>
		<img {src} class="bg-black/50 w-full aspect-21/9" {alt} />
	</header>
	<div class="p-4 space-y-4">
		<h6 class="h6 capitalize" data-toc-ignore="">{belt}</h6>
		<h3 class="h3" data-toc-ignore="">{name}</h3>
	</div>
	<hr class="opacity-50" />
	<!-- <footer class="p-4 flex justify-start center items-center space-x-4" /> -->
</div>
