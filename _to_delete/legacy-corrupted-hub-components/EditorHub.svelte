<script lang="ts">
	import EditorWorkspace from './workspaces/Editor/EditorWorkspace.svelte';
	import type { HubWorkspaceProps } from './hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<EditorWorkspace {...props} />
