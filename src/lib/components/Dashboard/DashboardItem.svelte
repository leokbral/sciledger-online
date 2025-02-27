<script lang="ts">
	export let classes: string = ''; //'bg-gradient-to-r from-pink-500 to-yellow-500 text-white';
</script>

<div
	class=" flex flex-col items-start w-full h-full overflow-hidden p-4 rounded-2xl gap-2 {classes}"
>
	<span class="stat-title font-semibold uppercase whitespace-normal leading-3 text-sm">
		<slot name="tittle" />
	</span>
	<span class="text-4xl font-bold whitespace-nowrap overflow-hidden">
		<slot name="message" />
	</span>
	<span class="text-xs font-normal leading-normal">
		<slot name="description" />
	</span>

	<slot name="generic" />
</div>
