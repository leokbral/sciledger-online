<script lang="ts">
	import { post } from '$lib/utils';
	import { onMount } from 'svelte';
	onMount(async () => await post(`/logout`));
</script>
