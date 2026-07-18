<script lang="ts">
	import HubWorkspaceNav from '../../HubWorkspaceNav.svelte';

	interface Props {
		baseHref: string;
	}

	let { baseHref }: Props = $props();

	let items = $derived([
		{ label: 'Home', href: baseHref, active: true },
		{ label: 'Papers', href: `${baseHref}#papers` },
		{ label: 'Members', action: 'members' as const },
		{ label: 'Roles', href: `${baseHref}/rbac` },
		{ label: 'Invitations', href: `${baseHref}/reviewer-invites` }
	]);
</script>

<HubWorkspaceNav {items} />
