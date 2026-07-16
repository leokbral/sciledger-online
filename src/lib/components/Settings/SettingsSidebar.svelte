<script lang="ts">
	import { page } from '$app/state';

	const links = [
		{ href: '/settings/account', label: 'Account' },
		{ href: '/settings/security', label: 'Security' },
		{ href: '/settings/reviewer', label: 'Reviewer' },
		{ href: '/settings/payments', label: 'Payments' },
		{ href: '/settings/notifications', label: 'Notifications' }
	];
</script>

<nav
	class="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
	aria-label="Settings navigation"
>
	{#each links as link (link.href)}
		<a
			href={link.href}
			data-sveltekit-preload-data
			aria-current={page.url.pathname === link.href ? 'page' : undefined}
			class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors {page
				.url.pathname === link.href
				? 'bg-primary-500/10 text-primary-700 dark:text-primary-300'
				: 'text-surface-600-400 hover:bg-surface-500/10'}"
		>
			{link.label}
		</a>
	{/each}
</nav>
