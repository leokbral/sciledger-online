<script lang="ts">
	import DashboadButton from '../Dashboard/DashboadButton.svelte';
	import DashboardItem from '../Dashboard/DashboardItem.svelte';

	interface Props {
		abstract: string;
	}

	let { abstract }: Props = $props();

	// let classes = 'bg-initial'; //'bg-linear-to-b from-[#d14fc5_-344%] to-[#8121eb_181%] gap-0!';

	let modalData = {
		// classes,
		abstract
	};
</script>

<DashboadButton component="abstract" {modalData} title="">
	<!-- <DashboardItem {classes}> -->
	<DashboardItem>
		<!-- <span slot="tittle" class="text-surface-50">
			<div class="inline text-lg mr-2"></div>
		</span> -->
		<!-- <div class="w-full h-full text-lg" slot="generic">Abstract</div> -->
		{#snippet generic()}
				<div class="w-full h-full text-lg bg-initial" >{abstract}</div>
			{/snippet}
	</DashboardItem>
</DashboadButton>
