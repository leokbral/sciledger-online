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
		head: ['Prop', 'Type', 'Default', 'Values', 'Description'],
		body: pageData.parameters ?? []
	};

	// Reactive
	let classesBase = $derived(`${cBase}`);
</script>

<div class="doc-shell-parameters {classesBase}">
	<Table {source} />
</div>