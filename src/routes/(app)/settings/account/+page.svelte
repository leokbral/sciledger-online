<script lang="ts">
	import { Modal } from '@skeletonlabs/skeleton-svelte';
	import { toaster } from '$lib/toaster-svelte';
	import SettingsCard from '$lib/components/Settings/SettingsCard.svelte';
	import SettingsField from '$lib/components/Settings/SettingsField.svelte';
	import StatusBadge from '$lib/components/Settings/StatusBadge.svelte';
	import { isOrcidPlaceholderEmail } from '$lib/helpers/orcidPlaceholderEmail';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	let emailVerified = $state(data.emailVerified);
	let pendingEmail = $state<string | null>(data.pendingEmail);

	// Contas criadas pelo login ORCID sem e-mail público ficam com um
	// placeholder não entregável. Elas conseguem entrar pelo ORCID, mas nenhum
	// e-mail da plataforma as alcança -- inclusive a recuperação de senha, que é
	// o único caminho para definir a senha que o callback gerou aleatoriamente.
	// O aviso fica visível até que um endereço real seja confirmado.
	let hasPlaceholderEmail = $derived(isOrcidPlaceholderEmail(data.user.email));

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

<SettingsCard title="Account">
	<div class="space-y-1">
		<p class="text-sm text-surface-600-400">{data.user.firstName} {data.user.lastName}</p>
		<p class="text-sm text-surface-600-400">@{data.user.username}</p>
	</div>
</SettingsCard>

<SettingsCard title="Email">
	<SettingsField label="Current Email">
		<div class="flex items-center gap-2">
			{#if hasPlaceholderEmail}
				<p class="text-sm font-medium italic text-surface-600-400">No email address</p>
				<StatusBadge label="Missing" tone="error" />
			{:else}
				<p class="text-sm font-medium">{data.user.email}</p>
				{#if emailVerified}
					<StatusBadge label="Verified" tone="success" />
				{:else}
					<StatusBadge label="Not verified" tone="warning" />
				{/if}
			{/if}
		</div>
	</SettingsField>

	{#if hasPlaceholderEmail}
		<div
			class="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
		>
			<p class="text-sm font-semibold text-amber-900 dark:text-amber-200">
				This account can only sign in through ORCID
			</p>
			<p class="text-sm text-amber-800 dark:text-amber-300">
				Your ORCID record does not expose a public email address, so we have no address on file for
				you. Until you add one, no platform email can reach you &mdash; including password recovery,
				which is the only way to set a password for this account. If you lose access to your ORCID
				account, we will not be able to help you recover this one.
			</p>
			<p class="text-sm text-amber-800 dark:text-amber-300">
				Add an email address below. We will send a confirmation link to it, and the address only
				takes effect once you confirm.
			</p>
		</div>
	{/if}

	{#if pendingEmail}
		<div class="space-y-2 rounded-md border p-3">
			<SettingsField label="Pending Email" value={pendingEmail} />
			<p class="text-sm text-surface-600-400">Waiting for confirmation</p>
			<button class="btn preset-tonal" onclick={resendConfirmation} disabled={isResending}>
				{isResending ? 'Resending...' : 'Resend Email'}
			</button>
		</div>
	{:else}
		<button class="btn preset-filled" onclick={openChangeEmailModal}>Change Email</button>
	{/if}
</SettingsCard>

<Modal open={openModal} onOpenChange={(e) => (openModal = e.open)}>
	{#snippet trigger()}
		<span></span>
	{/snippet}

	{#snippet content()}
		<div class="card mx-auto w-full max-w-md space-y-4 rounded-lg border p-6 shadow-2xl">
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
