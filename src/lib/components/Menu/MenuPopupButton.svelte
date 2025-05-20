<script lang="ts">
	interface Props {
		notificationQtd: number;
	}

	let { notificationQtd }: Props = $props();
</script>

<span class="badge-icon preset-filled-warning-500 absolute">{notificationQtd}</span>
<!-- <div class="relative inline-block"> -->
<button class="btn-icon preset-tonal btn-icon-lg">
	<span class="text-3xl">🥋</span>
</button>
<!-- </div> -->
