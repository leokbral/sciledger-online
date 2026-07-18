<script lang="ts">
	import AuthorWorkspace from './workspaces/Author/AuthorWorkspace.svelte';
	import type { HubWorkspaceProps } from './hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<AuthorWorkspace {...props} />
