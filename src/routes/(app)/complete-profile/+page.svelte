<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';

	let firstName = '';
	let lastName = '';
	let email = '';
	let country = '';
	let dob = '';
	let formWarning = '';
	let formSuccess = '';
	let isLoading = false;

	// Pré-preenche com dados do perfil se existirem
	$: if ($page.data.user) {
		firstName = $page.data.user.firstName || '';
		lastName = $page.data.user.lastName || '';
		email = $page.data.user.email || '';
		country = $page.data.user.country || '';
		dob = $page.data.user.dob || '';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		isLoading = true;
		formWarning = '';
		formSuccess = '';

		try {
			const response = await post('/complete-profile', {
				firstName,
				lastName,
				email,
				country,
				dob
			});

			if (response.success) {
				formSuccess = 'Perfil atualizado com sucesso!';
				setTimeout(() => {
					goto('/');
				}, 1000);
			} else {
				formWarning = response.message || 'Erro ao atualizar perfil';
			}
		} catch (error) {
			formWarning = 'Erro ao enviar formulário. Tente novamente.';
			console.error(error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50">
	<div class="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
		<img src="/favicon.png" alt="Logo" width="64px" height="60px" class="mb-6" />

		<h1 class="text-3xl font-bold mb-2 text-surface-900">Complete seu Perfil</h1>
		<p class="text-surface-600 mb-6">
			Encontramos alguns dados faltando. Por favor, preencha as informações abaixo.
		</p>

		<form on:submit={handleSubmit} class="space-y-4">
			<!-- First Name -->
			<div>
				<label for="firstName" class="block text-sm font-medium text-surface-700 mb-1">
					Nome
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
					Sobrenome
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

			<!-- Email -->
			<div>
				<label for="email" class="block text-sm font-medium text-surface-700 mb-1">
					Email
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					placeholder="joao@example.com"
					class="w-full px-4 py-2 rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
				/>
				<p class="text-xs text-surface-500 mt-1">
					Email será usado para recuperação de conta e notificações
				</p>
			</div>

			<!-- Country -->
			<div>
				<label for="country" class="block text-sm font-medium text-surface-700 mb-1">
					País (Opcional)
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
					Data de Nascimento (Opcional)
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
					Salvando...
				{:else}
					Continuar
				{/if}
			</button>

			<p class="text-center text-xs text-surface-500 mt-4">
				Você pode atualizar esses dados depois em suas configurações de conta
			</p>
		</form>
	</div>
</div>
