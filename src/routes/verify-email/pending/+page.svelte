<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';

	let message = $state('');
	let error = $state('');
	let sending = $state(false);

	let email = $derived(page.url.searchParams.get('email') || '');

	async function resendVerificationEmail() {
		if (!email || sending) return;

		sending = true;
		message = '';
		error = '';

		try {
			const response = await post('/verify-email/resend', { email });
			if (response.error) {
				error = response.error;
			} else {
				message = 'Verification email sent. Please check your inbox.';
			}
		} catch {
			error = 'Unable to resend the verification email right now.';
		} finally {
			sending = false;
		}
	}
</script>

<section class="min-h-screen flex items-center justify-center bg-surface-100 px-4">
	<div class="w-full max-w-md rounded-lg bg-white p-8 text-center shadow">
		<img src="/favicon.png" alt="SciLedger" width="56" height="52" class="mx-auto mb-6" />
		<h1 class="text-2xl font-bold text-surface-900">Verify your email</h1>
		<p class="mt-5 text-surface-700">We've sent a verification email to:</p>
		<p class="mt-2 break-all font-semibold text-surface-950">{email}</p>
		<p class="mt-5 text-surface-700">Please verify your email before signing in.</p>
		<p class="mt-4 text-sm text-surface-600">Remember to check your Spam folder.</p>

		{#if message}
			<p class="mt-5 rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
				{message}
			</p>
		{/if}

		{#if error}
			<p class="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
		{/if}

		<div class="mt-8 flex flex-col gap-3">
			<button
				type="button"
				onclick={resendVerificationEmail}
				disabled={sending || !email}
				class="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{sending ? 'Sending...' : 'Resend verification email'}
			</button>
			<button
				type="button"
				onclick={() => goto('/login')}
				class="rounded-md border border-surface-300 px-4 py-2 font-semibold text-surface-800 hover:bg-surface-50"
			>
				Try signing in again
			</button>
		</div>
	</div>
</section>
