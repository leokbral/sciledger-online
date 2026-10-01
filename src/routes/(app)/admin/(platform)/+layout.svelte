<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const sections = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/hubs', label: 'Hubs' },
		{ href: '/admin/papers', label: 'Papers' },
		{ href: '/admin/reviews', label: 'Reviews' },
		{ href: '/admin/invitations', label: 'Invitations' },
		{ href: '/admin/activity', label: 'Activity' }
	];

	function isActive(href: string) {
		if (href === '/admin') return page.url.pathname === '/admin';
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<header class="border-b border-slate-200 pb-4">
		<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</p>
		<h1 class="mt-1 text-2xl font-semibold text-slate-950">Administration</h1>
		<p class="mt-1 text-sm text-slate-600">
			Global, read-only view of the platform. Editorial decisions stay inside each hub.
		</p>
	</header>

	<nav aria-label="Administration sections" class="flex flex-wrap gap-2">
		{#each sections as section}
			<a
				href={section.href}
				aria-current={isActive(section.href) ? 'page' : undefined}
				class="rounded-lg border px-3 py-2 text-sm font-medium transition {isActive(section.href)
					? 'border-primary-500 bg-primary-500 text-white'
					: 'border-slate-200 bg-white text-slate-700 hover:border-primary-400 hover:text-slate-900'}"
			>
				{section.label}
			</a>
		{/each}
	</nav>

	{@render children?.()}
</div>
