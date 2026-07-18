<script lang="ts">
	import type { HubWorkspaceProps } from '../../hubTypes';
	import EditorHome from './EditorHome.svelte';

	let props: HubWorkspaceProps = $props();
</script>

<EditorHome {...props} />
