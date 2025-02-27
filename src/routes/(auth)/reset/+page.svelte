<script>
	import '/src/app.postcss';
</script>

<div class="main-container">
	<div class="main-form">
		<h1 class="input-fields">Código de verificação enviado! ✅</h1>
		<h1 class="input-fields">Verifique seu email! 📬</h1>
	</div>
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
		color: #7e0cf5;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		width: 50vw;
		/* height: 50%; */ /*magical number*/
		border-bottom: 1px solid #f7beef;
	}
	.input-fields {
		color: #f7beef;
		font-weight: 500;
		font-size: large;
		/* padding: 10px 6px; */
	}
	@media (max-width: 768px) {
		.main-form {
			width: 81vw;
		}
	}
	@media (max-width: 360px) {
		.main-form {
			width: 81vw;
		}
	}
</style>