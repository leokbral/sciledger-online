<script>
	

	

	

	/** @type {{type?: string, value?: string, display?: boolean, answerKey?: boolean, children?: import('svelte').Snippet}} */
	let {
		type = 'alternative',
		value = $bindable(''),
		display = true,
		answerKey = true,
		children
	} = $props();

	/**
	 * Don't mess up!
	 */
	/* export let style =
        height || width || color
            ? `height: ${height}px; width: ${width}px; --background-color: ${color}; --width: ${width}px; --height: ${height}px; --sizeY: ${
                  height - 4
              }px; --sizeX: ${width - height}px;"`
            : ""; */
</script>

{#if type === 'alternative'}
	<div
		class="alternative"
		contenteditable="true"
		bind:innerHTML={value}
		style="display:{display ? 'initial' : 'none'};"
		placeholder="Justificativa..."
	>
		{@render children?.()}
	</div>
{:else if type === 'essay'}
	<div
		class="essay"
		contenteditable="true"
		bind:innerHTML={value}
		style="display:{display ? 'initial' : 'none'};"
		placeholder={answerKey ? 'Chave de Resposta...' : 'Feedback'}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	.essay,
	.alternative {
		border-radius: 1rem;
		width: inherit;
		color: var(--saturated-purple);
		max-width: inherit;
		min-width: inherit;
		word-wrap: break-word;
	}

	[contenteditable]:empty:before {
		content: attr(placeholder);
		opacity: 0.4;
	}

	.essay {
		font-weight: 500;
		font-size: 1.125rem;
		padding: 1rem;
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.alternative {
		font-weight: 400;
		font-size: 1.025rem;
		padding: 1rem;
	}

	.alternative :global(*) {
		color: inherit !important;
		font-size: inherit !important;
		font-family: inherit !important;
		font-weight: inherit !important;
	}
</style>
