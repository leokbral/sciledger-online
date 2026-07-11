<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let emailVerified = $state(data.emailVerified);
	let pendingEmail = $state<string | null>(data.pendingEmail);

	let openModal = $state(false);
	let newEmail = $state('');
	let isSubmitting = $state(false);
	let isResending = $state(false);

	function openChangeEmailModal() {
		newEmail = '';
		openModal = true;
	}

	function closeChangeEmailModal() {
		if (isSubmitting) return;
		openModal = false;
	}

	async function submitEmailChange() {
		const trimmed = newEmail.trim();

		if (!trimmed) {
			toaster.warning({ title: 'Please enter a new email address.' });
			return;
		}

		if (!EMAIL_REGEX.test(trimmed)) {
			toaster.warning({ title: 'Please enter a valid email address.' });
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/account/email-change', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: trimmed })
			});
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to request email change.');
			}

			pendingEmail = payload.pendingEmail ?? trimmed;
			openModal = false;
			toaster.success({
				title: 'Confirmation email sent',
				description: `Check ${pendingEmail} to confirm your new email address.`
			});
		} catch (error: unknown) {
			toaster.error({
				title: 'Could not change email',
				description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
			});
		} finally {
			isSubmitting = false;
		}
	}

	async function resendConfirmation() {
		isResending = true;

		try {
			const response = await fetch('/api/account/email-change/resend', { method: 'POST' });
			const payload = await response.json();

			if (!response.ok) {
				throw new Error(payload?.error || 'Failed to resend confirmation email.');
			}

			toaster.success({ title: 'Confirmation email resent' });
		} catch (error: unknown) {
			toaster.error({
				title: 'Could not resend email',
				description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
			});
		} finally {
			isResending = false;
		}
	}
</script>

<div class="card border rounded-lg p-5 space-y-2">
	<h2 class="text-lg font-semibold">Conta</h2>
	<p class="text-sm text-surface-600-400">{data.user.firstName} {data.user.lastName}</p>
	<p class="text-sm text-surface-600-400">@{data.user.username}</p>
</div>

<div class="card border rounded-lg p-5 space-y-4">
	<h2 class="text-lg font-semibold">Email</h2>

	<div class="space-y-1">
		<p class="text-xs uppercase tracking-wide opacity-70">Current Email</p>
		<div class="flex items-center gap-2">
			<p class="text-sm font-medium">{data.user.email}</p>
			{#if emailVerified}
				<span class="badge preset-filled-success-500 text-xs">Verified</span>
			{:else}
				<span class="badge preset-filled-warning-500 text-xs">Not verified</span>
			{/if}
		</div>
	</div>

	{#if pendingEmail}
		<div class="rounded-md border p-3 space-y-2">
			<p class="text-xs uppercase tracking-wide opacity-70">Pending Email</p>
			<p class="text-sm font-medium">{pendingEmail}</p>
			<p class="text-sm text-surface-600-400">Waiting for confirmation</p>
			<button class="btn preset-tonal" onclick={resendConfirmation} disabled={isResending}>
				{isResending ? 'Resending...' : 'Resend Email'}
			</button>
		</div>
	{:else}
		<button class="btn preset-filled" onclick={openChangeEmailModal}>Change Email</button>
	{/if}
</div>

<Modal open={openModal} onOpenChange={(e) => (openModal = e.open)}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<div class="card border rounded-lg p-6 space-y-4 max-w-md w-full mx-auto shadow-2xl">
			<h3 class="text-lg font-semibold">Change Email</h3>

			<label class="block space-y-1">
				<span class="text-sm font-medium">New Email</span>
				<input
					type="email"
					class="input"
					placeholder="you@example.com"
					bind:value={newEmail}
					disabled={isSubmitting}
				/>
			</label>

			<div class="flex justify-end gap-3">
				<button class="btn preset-tonal" onclick={closeChangeEmailModal} disabled={isSubmitting}>
					Cancel
				</button>
				<button class="btn preset-filled" onclick={submitEmailChange} disabled={isSubmitting}>
					{isSubmitting ? 'Sending...' : 'Send Confirmation'}
				</button>
			</div>
		</div>
	{/snippet}
</Modal>
