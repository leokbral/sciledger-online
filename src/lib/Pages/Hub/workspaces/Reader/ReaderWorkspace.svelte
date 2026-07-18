<script lang="ts">
	import type { HubWorkspaceProps } from '../../hubTypes';
	import ReaderHome from './ReaderHome.svelte';

	let props: HubWorkspaceProps = $props();
</script>

<ReaderHome {...props} />
