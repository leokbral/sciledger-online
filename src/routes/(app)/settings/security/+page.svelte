<script lang="ts">
	import { goto } from '$app/navigation';
	import { Modal } from '@skeletonlabs/skeleton-svelte';
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
				description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
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
				description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
			});
		} finally {
			isRevokingAll = false;
		}
	}
</script>

<div class="card border rounded-lg p-5 space-y-2">
	<h2 class="text-lg font-semibold">Security</h2>
	<p class="text-sm text-surface-600-400">Manage the devices currently signed in to your account.</p>
</div>

{#if currentSession}
	{@const ua = parseUserAgent(currentSession.userAgent)}
	<div class="card border rounded-lg p-5 space-y-3">
		<h3 class="text-base font-semibold">Current Session</h3>

		<div class="flex flex-wrap items-center gap-2">
			<span class="badge preset-filled-primary-500 text-xs">Current</span>
			{#if currentSession.rememberMe}
				<span class="badge preset-outlined-primary-500 text-xs">Remember Me</span>
			{/if}
		</div>

		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<p class="text-xs uppercase tracking-wide opacity-70">Browser</p>
				<p class="text-sm font-medium">{ua.browser}</p>
			</div>
			<div>
				<p class="text-xs uppercase tracking-wide opacity-70">OS</p>
				<p class="text-sm font-medium">{ua.os}</p>
			</div>
			<div>
				<p class="text-xs uppercase tracking-wide opacity-70">Last Activity</p>
				<p class="text-sm font-medium">{formatDateTime(currentSession.lastActivityAt)}</p>
			</div>
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
	</div>
{/if}

<div class="card border rounded-lg p-5 space-y-4">
	<h3 class="text-base font-semibold">Other Active Sessions</h3>

	{#if otherSessions.length === 0}
		<p class="text-sm text-surface-600-400">No other active sessions.</p>
	{:else}
		<div class="space-y-3">
			{#each otherSessions as session (session.sessionId)}
				{@const ua = parseUserAgent(session.userAgent)}
				<div class="rounded-md border p-4 space-y-3">
					<div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">Browser</p>
							<p class="text-sm font-medium">{ua.browser}</p>
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">OS</p>
							<p class="text-sm font-medium">{ua.os}</p>
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">Created</p>
							<p class="text-sm font-medium">{formatDateTime(session.createdAt)}</p>
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">Last Activity</p>
							<p class="text-sm font-medium">{formatDateTime(session.lastActivityAt)}</p>
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">Expires</p>
							<p class="text-sm font-medium">{formatDateTime(session.expiresAt)}</p>
						</div>
						<div>
							<p class="text-xs uppercase tracking-wide opacity-70">Remember Me</p>
							<p class="text-sm font-medium">{session.rememberMe ? 'Yes' : 'No'}</p>
						</div>
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
</div>

<div class="card border-2 border-red-300 dark:border-red-900 rounded-lg p-5 space-y-3">
	<h3 class="text-base font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
	<p class="text-sm text-surface-600-400">
		Immediately sign out every other device currently signed in to your account. This session
		stays active.
	</p>
	<button
		class="btn preset-filled-error-500"
		onclick={() => (confirmRevokeAllOpen = true)}
		disabled={otherSessions.length === 0}
	>
		Terminate Other Sessions
	</button>
</div>

<Modal open={confirmRevokeAllOpen} onOpenChange={(e) => (confirmRevokeAllOpen = e.open)}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<div class="card border rounded-lg p-6 space-y-4 max-w-md w-full mx-auto shadow-2xl">
			<h3 class="text-lg font-semibold">Terminate Other Sessions?</h3>
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
		</div>
	{/snippet}
</Modal>
