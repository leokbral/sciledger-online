<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import Splash from '$lib/components/Splash.svelte';


	let login = $state('');
	let password = $state('');
	let formWarning = $state('');
	let processing = false;
	let notInView: boolean = $state(true);

	function hideSplash() {
		notInView = !notInView;
	}

	async function submit(event: unknown) {
		hideSplash();
		const response = await post(`/login`, { login, password });

		if (response.user) {
			goto('/');
		} else {
			hideSplash();
			formWarning = 'Credentials not found!';
		}
	}
</script>

<div class:hidden={notInView}>
	<Splash />
</div>
<div class="h-screen flex flex-col items-center justify-center bg-surface-100">
	<div
		class="w-full flex justify-center md:max-w-xl md:bg-white md:rounded-3xl md:shadow-2xl md:shadow-surface-500/50"
	>
		<form class="flex flex-col w-4/5 md:w-full md:px-16 md:py-14" onsubmit={preventDefault(submit)}>
			<img
				src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
				alt="Logo"
				width="64px"
				height="60px"
				class="self-start mb-4"
			/>

			<span class="text-2xl font-semibold mb-4 text-center text-surface-900">Sign in</span>

			<div class="flex flex-col gap-5 w-full">
				<fieldset class="flex flex-col">
					<input
						type="text"
						required
						placeholder="Email or Username"
						bind:value={login}
						class="bg-transparent rounded-xl border-b border-surface-500 text-black font-medium text-lg p-2 w-full focus:outline-none focus:border-primary-500 placeholder-gray-500"
					/>
				</fieldset>
				<fieldset class="flex flex-col">
					<input
						type="password"
						required
						placeholder="Password"
						bind:value={password}
						class="bg-transparent rounded-xl border-b border-surface-500 text-black font-medium text-lg p-2 w-full focus:outline-none focus:border-primary-500 placeholder-gray-500"
					/>
				</fieldset>
				{#if formWarning}
					<span transition:fade={{ duration: 500 }} class="text-red-500 font-bold"
						>{formWarning}</span
					>
				{/if}
			</div>
			{#if processing}
				<span class="text-purple-500">Processing...</span>
			{/if}
			<div class="flex flex-col mt-12 w-full">
				<button
					type="submit"
					class=" text-black font-bold py-2 px-4 rounded hover:bg-primary-500 self-end"
				>
					Start
					<img
						src="https://raw.githubusercontent.com/AulaZero/icons/main/icons/loginarrow.svg"
						alt="Entrar"
						width="20"
						height="20"
						class="ml-2 inline"
					/>
				</button>
				<div class="flex flex-col">
					<a href="/recovery" class="text-center text-primary-500 mt-4">Forgotten your password?</a>
					<a href="/register" class="text-center text-primary-500 mt-4">Sign up</a>
				</div>
			</div>
		</form>
	</div>
</div>
