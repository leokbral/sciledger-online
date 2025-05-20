<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { goto } from '$app/navigation';
	import { post } from '$lib/utils';
	import { fade } from 'svelte/transition';
	import '/src/app.css';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let email = data.userEmail;
	let verificationCode = $state('');
	let password = $state('');
	let newPassword = $state('');
	let formWarning = $state('');
	let processing = false;

	async function submit(event: unknown) {
		const response = await post(`/reset/${email}`, { email, password, verificationCode });

		if (response.user) {
			goto('/');
		} else {
			formWarning = 'Credênciais não encontradas!';
		}
		if (password != newPassword) {
			formWarning = 'as senhas são diferentes';
		} /* else {
			console.log('wtf');
			/* console.log(verificationCode);
			console.log(password);
			console.log(newPassword); * /
		} */
	}
</script>

<div class="main-container">
	<form class="main-form" onsubmit={preventDefault(submit)}>
		<img
			src="https://t4.ftcdn.net/jpg/05/44/04/47/360_F_544044746_Swth0lqH9CcTci8S5p2FS4Jqpcy6HWoI.jpg"
			alt="Logo"
			width="64px"
			height="105px"
			style="display: flex; align-self: center; align-self: flex-start;"
		/>
		<h3 style="font-weight: bold; color: white;align-self: flex-start;">Password Reset</h3>
		<div class="input-section">
			<fieldset class="form-group">
				<input
					class="input-fields"
					type="text"
					required
					placeholder="Código de Verificação"
					bind:value={verificationCode}
				/>
			</fieldset>
			<fieldset class="form-group">
				<input
					class="input-fields"
					type="password"
					required
					placeholder="Senha nova"
					bind:value={password}
				/>
			</fieldset>
			<fieldset class="form-group">
				<input
					class="input-fields"
					type="password"
					required
					placeholder="Confirmar senha nova"
					bind:value={newPassword}
				/>
			</fieldset>
			{#if formWarning}
				<span transition:fade={{ duration: 500 }} style="color: var(--yogurt); font-weight: bolder;"
					>{formWarning}</span
				>
			{/if}
		</div>
		{#if processing}
			<span style="color: var(--washed-purple);">Processando...</span>
		{/if}
		<div class="form-bottom">
			<!-- <a class="formLink" href="/register">Criar conta</a>
			<a class="formLink" href="/recovery"> Esqueceu a senha? </a> -->
			<button class="submitBtn" type="submit" style="align-self: flex-end;">
				<span style="color: #7e0cf5;font-weight: bold;">Go! </span>
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

<style>
	.main-container {
		height: 100vh;
		background-color: var(--std-purple);
		display: flex;
		flex-flow: column wrap;
		justify-content: center;
		align-items: center;
	}
	.main-form {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-around;
		width: 50vw;
		height: 50%; /*magical number*/
	}
	.input-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
		/*border: 1px solid red;*/
	}
	.input-fields {
		background-color: transparent;
		border: none;
		border-bottom: 1px solid #f7beef;
		color: #f7beef;
		font-weight: 500;
		font-size: large;
		padding: 10px 6px;
		width: 100%;
	}
	.input-fields:focus {
		border: 1px solid var(--std-purple);
		outline: 1px solid var(--yogurt);
	}
	.input-fields::placeholder {
		color: var(--yogurt);
	}

	.form-group {
		border: none;
		/* border: 1px solid red; */
		width: 100%;
		padding-left: 0;
	}
	.form-bottom {
		width: 100%;
		display: flex;
		flex-flow: column wrap;
		justify-content: space-between;
		margin-top: 50px;
	}
	/* .formLink {
		width: 30%;
		margin: 20px 0;
	} */
	.submitBtn {
		border: none;
		border-radius: 8px;
		width: 100px;
		height: 36px;
		color: #7e0cf5;
		background-color: #fefaff;
		cursor: pointer;
		display: flex;
		flex-wrap: nowrap;
		flex-direction: row;
		justify-content: space-evenly;
		align-items: center;
	}
	.submitBtn:hover {
		border: 3px solid var(--yogurt);
	}
	/* a {
		/* text-decoration: none; * /
		color: white;
	}
	a:visited {
		color: var(--yogurt);
	} */

	@media (max-width: 768px) {
		.main-form {
			width: 81vw;
		}

		/* .formLink {
			width: 60%;
		} */
		.submitBtn {
			margin-top: 40px;
		}
	}
	@media (max-width: 360px) {
		.main-form {
			width: 81vw;
		}
		/* .formLink {
			width: 60%;
		} */
	}
</style>