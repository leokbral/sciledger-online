<script lang="ts">
	import { goto } from '$app/navigation';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import SettingsField from '$lib/components/Settings/SettingsField.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
	import { toaster } from '$lib/toaster-svelte';
	import { parseUserAgent, formatDateTime } from './sessionFormat';
	import type { PageData } from './$types';

	type SessionSummary = {
		sessionId: string;
		createdAt: string | Date;
		lastActivityAt: string | Date;
		expiresAt: string | Date;
		rememberMe: boolean;
		currentSession: boolean;
		userAgent: string;
		ip: string;
	};

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let sessions = $state<SessionSummary[]>(data.sessions);
	let revokingSessionId = $state<string | null>(null);
	let isRevokingAll = $state(false);
	let confirmRevokeAllOpen = $state(false);

	const currentSession = $derived(sessions.find((s) => s.currentSession) ?? null);
	const otherSessions = $derived(sessions.filter((s) => !s.currentSession));

	async function terminateSession(sessionId: string) {
		revokingSessionId = sessionId;

		try {
			const response = await fetch(`/api/account/sessions/${sessionId}`, { method: 'DELETE' });
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to terminate session.');
			}

			if (payload.currentSession) {
				toaster.success({ title: 'Session terminated', description: 'Signing you out...' });
				await goto('/login', { invalidateAll: true });
				return;
			}

			sessions = sessions.filter((s) => s.sessionId !== sessionId);
			toaster.success({ title: 'Session terminated' });
		} catch (error: unknown) {
			toaster.error({
				title: 'Could not terminate session',
				description:
					error instanceof Error ? error.message : 'Something went wrong. Please try again.'
			});
		} finally {
			revokingSessionId = null;
		}
	}

	async function terminateAllOtherSessions() {
		isRevokingAll = true;

		try {
			const response = await fetch('/api/account/sessions/revoke-all', { method: 'POST' });
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to terminate other sessions.');
			}

			sessions = sessions.filter((s) => s.currentSession);
			confirmRevokeAllOpen = false;
			toaster.success({
				title: 'Other sessions terminated',
				description:
					payload.revokedCount > 0
						? `${payload.revokedCount} session(s) signed out.`
						: 'No other active sessions were found.'
			});
		} catch (error: unknown) {
			toaster.error({
				title: 'Could not terminate other sessions',
				description:
					error instanceof Error ? error.message : 'Something went wrong. Please try again.'
			});
		} finally {
			isRevokingAll = false;
		}
	}
</script>

<SettingsCard
	title="Security"
	description="Manage the devices currently signed in to your account."
/>

{#if currentSession}
	{@const ua = parseUserAgent(currentSession.userAgent)}
	<SettingsCard title="Current Session">
		<div class="flex flex-wrap items-center gap-2">
			<StatusBadge label="Current" tone="primary" />
			{#if currentSession.rememberMe}
				<StatusBadge label="Remember Me" tone="primary" variant="outlined" />
			{/if}
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<SettingsField label="Browser" value={ua.browser} />
			<SettingsField label="OS" value={ua.os} />
			<SettingsField label="Last Activity" value={formatDateTime(currentSession.lastActivityAt)} />
		</div>

		<div>
			<button
				class="btn preset-tonal"
				disabled
				title="Sign out or use &quot;Terminate Other Sessions&quot; to end other devices instead"
			>
				Revoke
			</button>
		</div>
	</SettingsCard>
{/if}

<SettingsCard title="Other Active Sessions">
	{#if otherSessions.length === 0}
		<p class="text-sm text-surface-600-400">No other active sessions.</p>
	{:else}
		<div class="space-y-3">
			{#each otherSessions as session (session.sessionId)}
				{@const ua = parseUserAgent(session.userAgent)}
				<div class="rounded-md border p-4 space-y-3">
					<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
						<SettingsField label="Browser" value={ua.browser} />
						<SettingsField label="OS" value={ua.os} />
						<SettingsField label="Created" value={formatDateTime(session.createdAt)} />
						<SettingsField label="Last Activity" value={formatDateTime(session.lastActivityAt)} />
						<SettingsField label="Expires" value={formatDateTime(session.expiresAt)} />
						<SettingsField label="Remember Me" value={session.rememberMe ? 'Yes' : 'No'} />
					</div>

					<button
						class="btn preset-tonal"
						onclick={() => terminateSession(session.sessionId)}
						disabled={revokingSessionId === session.sessionId}
					>
						{revokingSessionId === session.sessionId ? 'Terminating...' : 'Terminate'}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</SettingsCard>

<SettingsCard title="Danger Zone" danger>
	<p class="text-sm text-surface-600-400">
		Immediately sign out every other device currently signed in to your account. This session stays
		active.
	</p>
	<button
		class="btn preset-filled-error-500"
		onclick={() => (confirmRevokeAllOpen = true)}
		disabled={otherSessions.length === 0}
	>
		Terminate Other Sessions
	</button>
</SettingsCard>

<Modal open={confirmRevokeAllOpen} onOpenChange={(e) => (confirmRevokeAllOpen = e.open)}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<SettingsCard title="Terminate Other Sessions?" class="max-w-md w-full mx-auto shadow-2xl">
			<p class="text-sm text-surface-600-400">
				This will sign out every other device currently signed in to your account. This cannot be
				undone, and those devices will need to sign in again.
			</p>

			<div class="flex justify-end gap-3">
				<button
					class="btn preset-tonal"
					onclick={() => (confirmRevokeAllOpen = false)}
					disabled={isRevokingAll}
				>
					Cancel
				</button>
				<button
					class="btn preset-filled-error-500"
					onclick={terminateAllOtherSessions}
					disabled={isRevokingAll}
				>
					{isRevokingAll ? 'Terminating...' : 'Terminate Other Sessions'}
				</button>
			</div>
		</SettingsCard>
	{/snippet}
</Modal>
