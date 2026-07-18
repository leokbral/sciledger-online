<script lang="ts">
	import ReviewerWorkspace from './workspaces/Reviewer/ReviewerWorkspace.svelte';
	import type { HubWorkspaceProps } from './hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<ReviewerWorkspace {...props} />
