<script lang="ts">
	// Types
	import type { DocsShellSettings } from '$lib/layouts/DocsShell/types';
	// Components
	// Props
	interface Props {
		pageData: DocsShellSettings;
	}

	let { pageData }: Props = $props();

	// Classes
	const cBase = 'space-y-10';

	// Local
	const source = {
		head: ['Keys', 'Description'],
		body: pageData.keyboard ?? []
	};

	// Reactive
	let classesBase = $derived(`${cBase}`);
</script>

<div class="doc-shell-keyboard {classesBase}">
	<Table {source} />
</div>