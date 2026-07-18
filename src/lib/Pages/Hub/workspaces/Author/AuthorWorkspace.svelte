<script lang="ts">
	import type { HubWorkspaceProps } from '../../hubTypes';
	import AuthorHome from './AuthorHome.svelte';

	let props: HubWorkspaceProps = $props();
</script>

<AuthorHome {...props} />
