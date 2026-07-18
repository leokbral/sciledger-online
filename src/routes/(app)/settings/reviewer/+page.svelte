<script lang="ts">
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<SettingsCard title="Reviewer Profile">
	{#if data.isReviewer}
		<StatusBadge label="Reviewer Enabled" tone="success" />
		<p class="text-sm text-surface-600-400">Your account is enabled as a reviewer.</p>
	{:else}
		<StatusBadge label="Not a Reviewer" tone="neutral" />
		<p class="text-sm text-surface-600-400">Your account is not enabled as a reviewer yet.</p>
	{/if}
</SettingsCard>
