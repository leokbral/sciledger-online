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
				src="/favicon.png"
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
						class="bg-transparent rounded-xl border-b border-surface-500 text-black font-medium text-lg p-2 w-full focus:outline-hidden focus:border-primary-500 placeholder-gray-500"
					/>
				</fieldset>
				<fieldset class="flex flex-col">
					<input
						type="password"
						required
						placeholder="Password"
						bind:value={password}
						class="bg-transparent rounded-xl border-b border-surface-500 text-black font-medium text-lg p-2 w-full focus:outline-hidden focus:border-primary-500 placeholder-gray-500"
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
					class="group text-black font-bold py-2 px-4 rounded-sm hover:bg-primary-500 hover:text-black self-end"
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
				<a
					href="/orcid/redirect"
					class="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-emerald-600 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
				>
					<svg class="w-5 h-5" viewBox="0 0 256 256" fill="currentColor">
						<path d="M256 128c0 70.7-57.3 128-128 128C57.3 256 0 198.7 0 128 0 57.3 57.3 0 128 0c70.7 0 128 57.3 128 128z" fill="#A6CE39"/>
						<path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7C191.7 111.2 178 93 148 93h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.6 10.1 10.1z" fill="#fff"/>
					</svg>
					Sign in with ORCID
				</a>
				<div class="flex flex-col">
					<a href="/recovery" class="text-center text-primary-500 mt-4">Forgotten your password?</a>
					<a href="/register" class="text-center text-primary-500 mt-4">Sign up</a>
				</div>
			</div>
		</form>
	</div>
</div>
