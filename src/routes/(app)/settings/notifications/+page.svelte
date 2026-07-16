<script lang="ts">
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import SettingsField from '$lib/components/Settings/SettingsField.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
</script>

<SettingsCard
	title="Notifications"
	description="Review how account and editorial notifications are delivered."
>
	<SettingsField label="Delivery">
		<StatusBadge label="Automatic" tone="primary" variant="outlined" />
	</SettingsField>

	<p class="text-sm text-surface-600-400">
		Notifications are delivered through the notification feed and existing email events.
	</p>
</SettingsCard>
