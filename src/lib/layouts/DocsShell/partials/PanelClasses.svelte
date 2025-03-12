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
		head: ['Keys', 'Values', 'Description'],
		body: pageData.classes ?? []
	};

	// Reactive
	let classesBase = $derived(`${cBase}`);
</script>

<div class="doc-shell-classes {classesBase}">
	<Table {source} />
</div>