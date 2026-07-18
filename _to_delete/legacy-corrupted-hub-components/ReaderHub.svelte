<script lang="ts">
	import ReaderWorkspace from './workspaces/Reader/ReaderWorkspace.svelte';
	import type { HubWorkspaceProps } from './hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<ReaderWorkspace {...props} />
