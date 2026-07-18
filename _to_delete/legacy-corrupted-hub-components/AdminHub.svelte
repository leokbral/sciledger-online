<script lang="ts">
	import AdminWorkspace from './workspaces/Admin/AdminWorkspace.svelte';
	import type { HubWorkspaceProps } from './hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<AdminWorkspace {...props} />
