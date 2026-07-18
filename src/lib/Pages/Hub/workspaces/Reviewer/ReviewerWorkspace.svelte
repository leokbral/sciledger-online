<script lang="ts">
	import ReviewerHome from './ReviewerHome.svelte';
	import type { HubWorkspaceProps } from '../../hubTypes';

	let props: HubWorkspaceProps = $props();
</script>

<ReviewerHome {...props} />
