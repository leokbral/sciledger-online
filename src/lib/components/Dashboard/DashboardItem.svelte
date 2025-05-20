<script lang="ts">
	interface Props {
		classes?: string;
		tittle?: import('svelte').Snippet;
		message?: import('svelte').Snippet;
		description?: import('svelte').Snippet;
		generic?: import('svelte').Snippet;
	}

	let {
		classes = '',
		tittle,
		message,
		description,
		generic
	}: Props = $props();
</script>

<div
	class=" flex flex-col items-start w-full h-full overflow-hidden p-4 rounded-2xl gap-2 {classes}"
>
	<span class="stat-title font-semibold uppercase whitespace-normal leading-3 text-sm">
		{@render tittle?.()}
	</span>
	<span class="text-4xl font-bold whitespace-nowrap overflow-hidden">
		{@render message?.()}
	</span>
	<span class="text-xs font-normal leading-normal">
		{@render description?.()}
	</span>

	{@render generic?.()}
</div>
