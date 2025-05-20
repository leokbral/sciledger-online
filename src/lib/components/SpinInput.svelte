<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	/* TODO
        
        Change the SPINNER ICON
        FIX the RANGE in type == range
        
    */
	

	

	

	/**
	 * What type to use
	 */
	//export let type;

	
	
	

	

	

	
	/** @type {{height?: number, width?: number, color?: string, step?: number, min?: number, max?: number, value: any, readonly?: boolean, disabled?: any, style?: any}} */
	let {
		height = 24,
		width = 44,
		color = 'var(--std-purple)',
		step = 1,
		min = 0,
		max = 1000,
		value = $bindable(),
		readonly = false,
		disabled = readonly,
		style = height || width || color
			? `height: ${height}px; width: ${width}px; --background-color: ${color}; --width: ${width}px; --height: ${height}px; --sizeY: ${
					height - 4
				}px; --sizeX: ${width - height}px;"`
			: ''
	} = $props();
</script>

<div class="input-container">
	<input type="number" {style} bind:value {readonly} {disabled} onchange={bubble('change')} {step} {min} {max} />
</div>

<style>
	input {
		color: var(--std-purple);
	}

	input[type='number'] {
		--height: 41px;
		padding: 4%;
		height: var(--height);
		text-align: center;
		padding-right: calc(var(--height) / 2);
		border-radius: var(--height);
		border: none;
		color: white;
		background-color: var(--std-purple);
		padding-left: 1.25rem;
	}
</style>
