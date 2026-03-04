<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import '/src/app.css';
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let firstName = $state('');
	let lastName = $state('');
	let username = $state('');
	let country = $state('');
	let dob = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let processing = $state(false);
	let isAdmin = false;
	let formWarning = $state('');
	
	// Parâmetros do convite (se vier de um email de convite)
	let inviteToken = $state('');
	let inviteHubId = $state('');
	let isInvite = $state(false);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		inviteToken = params.get('inviteToken') || '';
		inviteHubId = params.get('hubId') || '';
		const inviteEmail = params.get('email') || '';
		const error = params.get('error');
		
		if (inviteToken) {
			isInvite = true;
			email = inviteEmail;
		}
		
		if (error) {
			formWarning = decodeURIComponent(error);
		}
	});

	async function submit(event: Event) {
		//event.preventDefault();
		formWarning = '';
		processing = true;

		if (password !== confirmPassword) {
			formWarning = 'Passwords do not match!';
			processing = false;
			return;
		}

		try {
			// Adiciona '@' ao username apenas no envio dos dados
			const formattedUsername = formatUsername(username);
			
			const response = await post(`/register`, {
				firstName,
				lastName,
				username: formattedUsername,
				country,
				dob,
				email,
				password,
				confirmPassword,
				isAdmin
			});

			if (response.user) {
				// Se for um registro através de convite, criar um convite de hub
				if (isInvite && inviteToken && inviteHubId) {
					try {
						// Criar convite de hub para o usuário aceitar depois
						await fetch('/api/email-reviewer-invitation/convert', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								token: inviteToken,
								userId: response.user.id
							})
						});
					} catch (inviteError) {
						console.error('Error converting invitation:', inviteError);
						// Continua mesmo se houver erro no convite
					}
				}
				
				goto('/');
			} else {
				formWarning = `User already registered or other issue! ${JSON.stringify(response)}`;
			}
		} catch (error) {
			formWarning = 'An error occurred. Please try again.';
		} finally {
			processing = false;
		}
	}

	// Adiciona '@' ao username apenas no envio dos dados
    function formatUsername(username: string): string {
        return username.startsWith('@') ? username : `@${username}`;
    }
</script>

<div class="flex items-center justify-center min-h-screen bg-surface-100">
	<div class="w-full max-w-lg p-6 bg-white rounded-xl md:shadow-2xl md:shadow-surface-500/50">
		<form onsubmit={preventDefault(submit)} class="space-y-6">
			<img
				src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
				alt="Logo"
				width="64px"
				height="105px"
				class="mx-auto"
			/>

			<h3 class="text-2xl font-bold text-center text-surface-900">
				{isInvite ? 'Complete Your Reviewer Registration' : 'Create Your Account'}
			</h3>

			{#if isInvite}
				<p class="text-center text-sm text-surface-600">
					You've been invited to join as a reviewer. Complete your registration below.
				</p>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 w-full gap-1">
					<fieldset class="space-y-1">
						<label for="firstName" class="block text-sm font-medium text-surface-700"
							>First Name</label
						>
						<input
							id="firstName"
							type="text"
							required
							placeholder="First Name"
							bind:value={firstName}
							class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
						/>
					</fieldset>

					<fieldset class="space-y-1">
						<label for="lastName" class="block text-sm font-medium text-surface-700"
							>Last Name</label
						>
						<input
							id="lastName"
							type="text"
							required
							placeholder="Last Name"
							bind:value={lastName}
							class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
						/>
					</fieldset>
				</div>
				
				<fieldset class="space-y-1">
					<label for="username" class="block text-sm font-medium text-surface-700"
						>User Name</label
					>
					<input
						id="username"
						type="text"
						required
						placeholder="@username"
						bind:value={username}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
					/>
				</fieldset>

				<fieldset class="space-y-1">
					<label for="country" class="block text-sm font-medium text-surface-700"
						>Country / Region</label
					>
					<input
						id="country"
						type="text"
						required
						placeholder="Country / Region"
						bind:value={country}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
					/>
				</fieldset>

				<fieldset class="space-y-1">
					<label for="dob" class="block text-sm font-medium text-surface-700">Date of Birth</label>
					<input
						id="dob"
						type="date"
						required
						placeholder="Date of Birth"
						bind:value={dob}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
					/>
				</fieldset>

				<fieldset class="space-y-1">
					<label for="email" class="block text-sm font-medium text-surface-700">Email</label>
					<input
						id="email"
						type="email"
						required
						placeholder="Email"
						bind:value={email}
						disabled={isInvite}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900 disabled:bg-surface-100 disabled:cursor-not-allowed"
					/>
				</fieldset>

				<fieldset class="space-y-1">
					<label for="password" class="block text-sm font-medium text-surface-700">Password</label>
					<input
						id="password"
						type="password"
						required
						placeholder="Password"
						bind:value={password}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
					/>
				</fieldset>

				<fieldset class="space-y-1">
					<label for="confirmPassword" class="block text-sm font-medium text-surface-700"
						>Confirm Password</label
					>
					<input
						id="confirmPassword"
						type="password"
						required
						placeholder="Confirm Password"
						bind:value={confirmPassword}
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
					/>
				</fieldset>
			</div>

			{#if formWarning}
				<p transition:fade={{ duration: 200 }} class="text-red-600 font-bold">{formWarning}</p>
			{/if}

			{#if processing}
				<p class="text-purple-600">Processing...</p>
			{/if}

			<a
				href="/orcid/redirect"
				class="w-full inline-flex items-center justify-center gap-2 rounded-md border border-emerald-600 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
			>
				<svg class="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
					<path d="M256 128c0 70.7-57.3 128-128 128C57.3 256 0 198.7 0 128 0 57.3 57.3 0 128 0c70.7 0 128 57.3 128 128z" fill="#A6CE39"/>
					<path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.6 10.1 10.1z" fill="#fff"/>
				</svg>
				Register with ORCID
			</a>

			<div class="flex items-center justify-between mt-6">
				<a href="/login" class="text-sm text-primary-600 hover:underline"
					>Already have an account?</a
				>
				<button
					type="submit"
					class="group text-black font-bold py-2 px-4 rounded-sm hover:bg-primary-500 hover:text-black"
					disabled={processing}
				>
					Start
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/loginarrow.svg"
						alt="Entrar"
						width="20"
						height="20"
						class="ml-2 inline [filter:invert(36%)_sepia(93%)_saturate(1826%)_hue-rotate(202deg)_brightness(97%)_contrast(92%)] group-hover:[filter:brightness(0)_invert(1)]"
					/>
				</button>
			</div>
		</form>
	</div>
</div>
