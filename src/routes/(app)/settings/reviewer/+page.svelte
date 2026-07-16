<script lang="ts">
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import SettingsField from '$lib/components/Settings/SettingsField.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<SettingsCard title="Reviewer Profile">
	<SettingsField label="Status">
		<StatusBadge
			label={data.isReviewer ? 'Reviewer Enabled' : 'Reviewer Not Enabled'}
			tone={data.isReviewer ? 'success' : 'neutral'}
			variant={data.isReviewer ? 'filled' : 'outlined'}
		/>
	</SettingsField>

	<p class="text-sm text-surface-600-400">
		{#if data.isReviewer}
			Your account is enabled as a reviewer.
		{:else}
			Your account is not yet enabled as a reviewer.
		{/if}
	</p>
</SettingsCard>
