<script lang="ts">
	import HubWorkspaceNav from '../../HubWorkspaceNav.svelte';

	interface Props {
		baseHref: string;
	}

	let { baseHref }: Props = $props();

	let items = $derived([
		{ label: 'Home', href: baseHref, active: true },
		{ label: 'Papers', href: `${baseHref}#papers` },
		{ label: 'Reviewers', href: `${baseHref}#reviewers` },
		{ label: 'Members', action: 'members' as const }
	]);
</script>

<HubWorkspaceNav {items} />
