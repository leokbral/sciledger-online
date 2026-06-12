<script lang="ts">
	import {
		getDisplayRoles,
		getRoleBadgeClass,
		getRoleDisplay,
		getRoleLabel,
		type RoleAssignmentLike
	} from '$lib/helpers/roleDisplay';

	interface Props {
		assignments?: RoleAssignmentLike[];
		roleLabels?: Record<string, string>;
	}

	let { assignments = [], roleLabels = {} }: Props = $props();

	function labelFor(roleKey: string | null, fallbackLabel = 'Member') {
		if (!roleKey) return 'Member';
		return roleLabels[roleKey] ?? fallbackLabel ?? getRoleLabel(roleKey);
	}

	function rolesForDisplay() {
		const roles = getDisplayRoles(assignments);
		if (roles.length === 0) {
			return [getRoleDisplay(null)];
		}

		return roles.map((role) => ({
			...role,
			label: labelFor(role.key, role.label)
		}));
	}

	function badgeClass(roleKey: string | null, primary = false) {
		const tone = getRoleBadgeClass(roleKey);
		const base =
			'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold';
		return primary ? `${base} ${tone} shadow-sm` : `${base} ${tone}`;
	}

	let roles = $derived(rolesForDisplay());
	let primaryRole = $derived(roles[0]);
</script>

<span class={badgeClass(primaryRole.key, true)} title={primaryRole.label}>
	{#if primaryRole.icon}
		<span aria-hidden="true">{primaryRole.icon}</span>
	{/if}
	<span>{primaryRole.label}</span>
</span>
