<script lang="ts">
	import HubWorkspaceNav from '../../HubWorkspaceNav.svelte';

	interface Props {
		baseHref: string;
	}

	let { baseHref }: Props = $props();

	let items = $derived([
		{ label: 'Home', href: baseHref, active: true },
		{ label: 'Reviews', href: `${baseHref}#reviewer-papers` },
		{ label: 'Papers', href: `${baseHref}#papers` }
	]);
</script>

<HubWorkspaceNav {items} />
