<script>
	/* TODO
        
        Change the SPINNER ICON
        FIX the RANGE in type == range
        
    */
	/**
	 * How high should the button be?
	 */
	export let height = 24;

	/**
	 * How wide should the button be?
	 */
	export let width = 44;

	/**
	 * What color to use
	 */
	export let color = 'var(--std-purple)';

	/**
	 * What type to use
	 */
	//export let type;

	/**
	 * What step to use
	 */
	export let step = 1;
	/**
	 * What min value to use
	 */
	export let min = 0;
	/**
	 * What max value to use
	 */
	export let max = 1000;

	/**
	 * What type to use
	 * @type {any}
	 */
	export let value;

	/**
	 * Is readonly?
	 */
	export let readonly = false;
	export let disabled = readonly;

	/**
	 * Don't mess up!
	 */
	export let style =
		height || width || color
			? `height: ${height}px; width: ${width}px; --background-color: ${color}; --width: ${width}px; --height: ${height}px; --sizeY: ${
					height - 4
				}px; --sizeX: ${width - height}px;"`
			: '';
</script>

<div class="input-container">
	<input type="number" {style} bind:value {readonly} {disabled} on:change {step} {min} {max} />
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
