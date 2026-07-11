<script lang="ts">
	import { goto } from '$app/navigation';
	import SettingsSidebar from '$lib/components/Settings/SettingsSidebar.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="mx-auto max-w-5xl space-y-6">
	<header class="space-y-1">
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-surface-600-400">Manage your account, security, and payment preferences.</p>
	</header>

	<div class="grid gap-6 md:grid-cols-[200px_1fr]">
		<SettingsSidebar />

		<div class="space-y-6">
			{@render children?.()}
		</div>
	</div>

	<div>
		<button class="btn preset-tonal" onclick={() => goto('/review')}>Voltar para Review</button>
	</div>
</section>
