<script lang="ts">
	import {
		Activity,
		BookOpen,
		ClipboardCheck,
		FileText,
		Inbox,
		Plus,
		Search,
		Settings,
		ShieldCheck,
		Users
	} from '@lucide/svelte';
	import type { DashboardQuickAction } from './types';

	interface Props {
		actions?: DashboardQuickAction[];
	}

	let { actions = [] }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each actions as action (action.label)}
		<svelte:element
			this={action.href && !action.disabled ? 'a' : 'button'}
			type={action.href && !action.disabled ? undefined : 'button'}
			href={action.href && !action.disabled ? action.href : undefined}
			class="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3.5 py-2 text-sm font-medium text-surface-700 transition hover:border-surface-300 hover:bg-surface-50 hover:text-surface-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60"
			disabled={action.href ? undefined : (action.disabled ?? true)}
			aria-disabled={action.disabled ? 'true' : undefined}
			aria-label={action.label}
			title={action.description}
			data-sveltekit-preload-data={action.href ? 'hover' : undefined}
		>
			<span class="text-surface-500" aria-hidden="true">
				{#if action.icon === 'activity'}
					<Activity size={16} />
				{:else if action.icon === 'book'}
					<BookOpen size={16} />
				{:else if action.icon === 'clipboard'}
					<ClipboardCheck size={16} />
				{:else if action.icon === 'file'}
					<FileText size={16} />
				{:else if action.icon === 'inbox'}
					<Inbox size={16} />
				{:else if action.icon === 'plus'}
					<Plus size={16} />
				{:else if action.icon === 'search'}
					<Search size={16} />
				{:else if action.icon === 'settings'}
					<Settings size={16} />
				{:else if action.icon === 'shield'}
					<ShieldCheck size={16} />
				{:else}
					<Users size={16} />
				{/if}
			</span>
			<span>{action.label}</span>
		</svelte:element>
	{/each}
</div>
