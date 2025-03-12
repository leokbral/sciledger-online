<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import '/src/app.css';
	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';

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

			<h3 class="text-2xl font-bold text-center text-surface-900">Create Your Account</h3>

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
						class="w-full p-2 border border-surface-500 rounded-md text-surface-900"
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

			<div class="flex items-center justify-between mt-6">
				<a href="/login" class="text-sm text-primary-600 hover:underline"
					>Already have an account?</a
				>
				<button
					type="submit"
					class="flex items-center px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700"
					disabled={processing}
				>
					<span class="mr-2 font-bold">Start</span>
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/loginarrow.svg"
						alt="Entrar"
						width="20"
						height="20"
					/>
				</button>
			</div>
		</form>
	</div>
</div>
