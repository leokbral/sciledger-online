<script lang="ts">
	import type { HubWorkspaceProps } from '../../hubTypes';
	import AdminHome from './AdminHome.svelte';

	let props: HubWorkspaceProps = $props();
</script>

<AdminHome {...props} />
