<script lang="ts">
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';

	const links = [
		{ href: '/settings/account', label: 'Account', icon: 'mdi:account-circle-outline' },
		{ href: '/settings/security', label: 'Security', icon: 'mdi:shield-lock-outline' },
		{ href: '/settings/reviewer', label: 'Reviewer', icon: 'mdi:account-check-outline' },
		{ href: '/settings/payments', label: 'Payments', icon: 'mdi:credit-card-outline' },
		{ href: '/settings/notifications', label: 'Notifications', icon: 'mdi:bell-outline' }
	];
</script>

<nav
	class="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
	aria-label="Settings navigation"
>
	{#each links as link (link.href)}
		{@const isActive = page.url.pathname === link.href}
		<a
			href={link.href}
			data-sveltekit-preload-data
			aria-current={isActive ? 'page' : undefined}
			class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors {isActive
				? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
				: 'text-surface-600-400 hover:bg-surface-500/10'}"
		>
			<Icon icon={link.icon} class="size-4 shrink-0" aria-hidden="true" />
			{link.label}
		</a>
	{/each}
</nav>
