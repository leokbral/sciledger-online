<script>
	/** @type {{errors: any}} */
	let { errors } = $props();
</script>

{#if errors}
	<ul class="error-messages">
		{#each Object.keys(errors) as key}
			<li>{key} {errors[key]}</li>
		{/each}
	</ul>
{/if}