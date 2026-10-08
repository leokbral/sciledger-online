<script lang="ts">
	import { fade } from 'svelte/transition';
	import { post } from '$lib/utils';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let email = $state('');
	let isLoading = $state(false);
	let formWarning = $state('');
	let sentTo = $state<string | null>(data.sentTo);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;
		formWarning = '';

		try {
			const response = await post('/orcid/email', { email });

			if (response.success) {
				sentTo = response.email ?? email;
			} else {
				formWarning = response.message || 'Could not send the confirmation email.';
			}
		} catch (error) {
			formWarning = 'Error submitting form. Please try again.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	function startOver() {
		sentTo = null;
		email = '';
	}
</script>

<svelte:head>
	<title>Confirm your email | SciLedger</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50 py-10"
>
	<div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
		<img
			src="/brand/logo/sciledger-logo.svg"
			alt="SciLedger"
			width="160"
			height="47"
			class="mb-6 h-auto w-40"
		/>

		{#if sentTo}
			<h1 class="text-3xl font-bold mb-2 text-surface-900">Check your inbox</h1>
			<p class="text-surface-600 mb-4">
				We sent a confirmation link to <span class="font-medium break-all">{sentTo}</span>. Open it
				to finish signing in.
			</p>
			<p class="text-sm text-surface-600 mb-6">
				The link is valid for 24 hours. Until you confirm, no account is created and nothing is
				changed.
			</p>
			<button
				type="button"
				onclick={startOver}
				class="text-sm font-medium text-primary-700 underline hover:text-primary-800"
			>
				Use a different email address
			</button>
		{:else}
			<h1 class="text-3xl font-bold mb-2 text-surface-900">Confirm your email</h1>
			<p class="text-surface-600 mb-6">
				{#if data.firstName}
					Welcome, {data.firstName}.
				{/if}
				Your ORCID record does not share an email address publicly, so we need one before we can
				finish.
			</p>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-surface-700 mb-1">
						Email address
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="you@university.edu"
						class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
					/>
					<p class="text-xs text-surface-500 mt-1">
						We will send a confirmation link to this address. It only takes effect once you open
						the link. If the address already belongs to a SciLedger account, confirming connects
						your ORCID iD to it &mdash; you will then be able to sign in with ORCID
						<strong>or</strong> with your email and password.
					</p>
				</div>

				{#if formWarning}
					<div
						transition:fade={{ duration: 300 }}
						class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"
					>
						{formWarning}
					</div>
				{/if}

				<button
					type="submit"
					disabled={isLoading}
					class="w-full mt-6 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 text-white font-semibold py-3 rounded-lg transition-colors"
				>
					{#if isLoading}
						Sending...
					{:else}
						Send confirmation link
					{/if}
				</button>

				<p class="text-center text-xs text-surface-500 mt-4">
					An email address is required so we can reach you about your submissions and reviews, and
					so you can recover your account if you lose access to ORCID.
				</p>
			</form>
		{/if}
	</div>
</div>
