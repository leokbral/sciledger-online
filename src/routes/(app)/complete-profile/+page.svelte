<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { isOrcidPlaceholderEmail } from '$lib/helpers/orcidPlaceholderEmail';

	let firstName = '';
	let lastName = '';
	let country = '';
	let dob = '';
	let formWarning = '';
	let formSuccess = '';
	let isLoading = false;

	// Read-only mirror of the stored address. This screen never submits it:
	// POST /complete-profile rejects any non-empty `email` field, because
	// changing an address requires proof of ownership and therefore has to go
	// through POST /api/account/email-change (exposed by /settings/account).
	let email = '';

	// Pré-preenche com dados do perfil se existirem
	$: if ($page.data.user) {
		firstName = $page.data.user.firstName || '';
		lastName = $page.data.user.lastName || '';
		email = $page.data.user.email || '';
		country = $page.data.user.country || '';
		dob = $page.data.user.dob || '';
	}

	// ORCID accounts without a public e-mail are created with a deterministic
	// placeholder address (see $lib/helpers/orcidPlaceholderEmail). Those users
	// have no usable address for recovery or notifications, so point them at
	// the verified change flow.
	$: isPlaceholderEmail = isOrcidPlaceholderEmail(email);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;
		formWarning = '';
		formSuccess = '';

		try {
			// `email` is deliberately absent from this payload.
			const response = await post('/complete-profile', {
				firstName,
				lastName,
				country,
				dob
			});

			if (response.success) {
				formSuccess = 'Profile updated successfully!';
				setTimeout(() => {
					goto('/');
				}, 1000);
			} else {
				formWarning = response.message || 'Error updating profile';
			}
		} catch (error) {
			formWarning = 'Error submitting form. Please try again.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50 py-10">
	<div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
		<img
			src="/brand/logo/sciledger-logo.svg"
			alt="SciLedger"
			width="160"
			height="47"
			class="mb-6 h-auto w-40"
		/>

		<h1 class="text-3xl font-bold mb-2 text-surface-900">Complete Your Profile</h1>
		<p class="text-surface-600 mb-6">
			We found some missing details. Please fill in the information below.
		</p>

		<form on:submit={handleSubmit} class="space-y-4">
			<!-- First Name -->
			<div>
				<label for="firstName" class="block text-sm font-medium text-surface-700 mb-1">
					First Name
				</label>
				<input
					type="text"
					id="firstName"
					bind:value={firstName}
					required
					placeholder="João"
					class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
			</div>

			<!-- Last Name -->
			<div>
				<label for="lastName" class="block text-sm font-medium text-surface-700 mb-1">
					Last Name
				</label>
				<input
					type="text"
					id="lastName"
					bind:value={lastName}
					required
					placeholder="Silva"
					class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
			</div>

			<!-- Email (read-only: changing it requires the verified flow) -->
			<div>
				<span class="block text-sm font-medium text-surface-700 mb-1">Email</span>
				{#if isPlaceholderEmail}
					<p
						class="w-full px-4 py-2 rounded-lg border border-surface-200 bg-surface-100 text-sm text-surface-500 italic break-all"
					>
						No e-mail address on file
					</p>
					<p class="text-xs text-amber-700 mt-1">
						Your ORCID record does not expose a public e-mail address, so we could not import one.
						<a
							href="/settings/account"
							class="font-medium underline hover:text-amber-800"
						>
							Add your e-mail in account settings
						</a>
						to enable account recovery and notifications.
					</p>
				{:else}
					<p
						class="w-full px-4 py-2 rounded-lg border border-surface-200 bg-surface-100 text-sm text-surface-700 break-all"
					>
						{email || '—'}
					</p>
					<p class="text-xs text-surface-500 mt-1">
						This email is used for account recovery and notifications. To change it, go to
						<a href="/settings/account" class="font-medium underline hover:text-surface-700">
							account settings
						</a>
						— the new address has to be confirmed before it takes effect.
					</p>
				{/if}
			</div>

			<!-- Country -->
			<div>
				<label for="country" class="block text-sm font-medium text-surface-700 mb-1">
					Country (Optional)
				</label>
				<input
					type="text"
					id="country"
					bind:value={country}
					placeholder="Brasil"
					class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
			</div>

			<!-- Date of Birth -->
			<div>
				<label for="dob" class="block text-sm font-medium text-surface-700 mb-1">
					Date of Birth (Optional)
				</label>
				<input
					type="date"
					id="dob"
					bind:value={dob}
					class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
			</div>

			<!-- Warnings/Success -->
			{#if formWarning}
				<div
					transition:fade={{ duration: 300 }}
					class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm"
				>
					{formWarning}
				</div>
			{/if}

			{#if formSuccess}
				<div
					transition:fade={{ duration: 300 }}
					class="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm"
				>
					{formSuccess}
				</div>
			{/if}

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={isLoading}
				class="w-full mt-6 bg-primary-500 hover:bg-primary-600 disabled:bg-surface-400 text-white font-semibold py-3 rounded-lg transition-colors"
			>
				{#if isLoading}
					Saving...
				{:else}
					Continue
				{/if}
			</button>

			<p class="text-center text-xs text-surface-500 mt-4">
				You can update this information later in your account settings
			</p>
		</form>
	</div>
</div>
