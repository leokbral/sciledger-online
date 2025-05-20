<script lang="ts">
	import { run, preventDefault } from 'svelte/legacy';

	//import InputField from '$lib/InputField.svelte';
	import { post } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import '/src/app.css';
	let email = $state('');
	let processing = $state(false);
	let modalToggle = true;
	run(() => {
		modalToggle;
	});

	async function submit(event: unknown) {
		processing = true;
		const response = await post(`/recovery`, { email, host: page.url.origin });
		// TODO handle network errors
		//errors = response.errors;

		if (response.message == 'success') {
			goto('/reset');
		} else {
			console.log('Credentials not found!'); //formWarning = 'Credênciais não encontradas!';
		}
	}
</script>

<div class="h-screen flex flex-col justify-center items-center bg-surface-100">
	<div class="w-full flex justify-center md:max-w-xl md:bg-white md:rounded-3xl md:shadow-2xl md:shadow-surface-500/50"></div>
	<form
		class="flex flex-col items-center justify-between h-3/5 w-2/5 max-w-lg"
		onsubmit={preventDefault(submit)}
	>
		<!-- Imagem do Logo -->
		<img
			src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
			alt="Logo"
			width="64px"
			height="105px"
			class="self-center mb-4"
		/>

		<!-- Título -->
		<div>
			<div class="text-3xl font-bold text-surface-900 self-start mb-4">Reset your password</div>
			<div class="text-base font-normal text-surface-900 self-start">
				Enter your email address that you use with your account to continue.
			</div>
		</div>
		<!-- Seção de Entrada -->
		<div class="flex flex-col gap-5 w-full mb-4">
			<input
				class="bg-transparent rounded-xl border-washed-purple text-washed-purple font-medium text-lg p-2 w-full focus:outline-hidden focus:border-std-purple placeholder-yogurt"
				type="email"
				required
				placeholder="Email"
				bind:value={email}
			/>
		</div>

		<!-- Mensagem de Processamento -->
		{#if processing}
			<span class="text-washed-purple">Processing...</span>
		{/if}

		<!-- Parte Inferior do Formulário -->
		<div class="w-full flex flex-col justify-between mt-12">
			<a class="text-surface-900 mb-5" href="/login">Lembrei!</a>
			<button
				class="bg-fefaff text-7e0cf5 border-none rounded-lg w-24 h-9 cursor-pointer flex items-center justify-evenly hover:border-yogurt"
				type="submit"
			>
				<span class="font-bold text-surface-900">Go!</span>
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