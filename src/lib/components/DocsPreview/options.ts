// Previewer Background Options

export const backgrounds: Record<string, string> = {
	'bg-transparent': 'bg-transparent',
	neutral: 'bg-white/10 dark:bg-black/10',
	'neutral-opaque': 'bg-white/50 dark:bg-black/50',
	// Surfaces
	'bg-surface-50': 'bg-surface-50 text-surface-900',
	'bg-surface-900': 'bg-surface-900 text-surface-50',
	// Filled
	'preset-filled-surface-500': `variant-filled-surface`,
	'preset-filled-primary-500': `variant-filled-primary`,
	'preset-filled-secondary-500': `variant-filled-secondary`,
	'preset-filled-tertiary-500': `variant-filled-tertiary`,
	'preset-filled-success-500': `variant-filled-success`,
	'preset-filled-warning-500': `variant-filled-warning`,
	'preset-filled-error-500': `variant-filled-error`,
	// Gradient
	'primary-to-secondary': 'bg-linear-to-br from-primary-500 to-secondary-500',
	'secondary-to-tertiary': 'bg-linear-to-br from-secondary-500 to-tertiary-500',
	'tertiary-to-primary': 'bg-linear-to-br from-tertiary-500 to-primary-500',
	'secondary-to-primary': 'bg-linear-to-br from-secondary-500 to-primary-500',
	'tertiary-to-secondary': 'bg-linear-to-br from-tertiary-500 to-secondary-500',
	'primary-to-tertiary': 'bg-linear-to-br from-primary-500 to-tertiary-500',
	'success-to-warning': 'bg-linear-to-br from-success-500 to-warning-500',
	'warning-to-error': 'bg-linear-to-br from-warning-500 to-error-500',
	'error-to-success': 'bg-linear-to-br from-error-500 to-success-500',
	'warning-to-success': 'bg-linear-to-br from-warning-500 to-success-500',
	'error-to-warning': 'bg-linear-to-br from-error-500 to-warning-500',
	'success-to-error': 'bg-linear-to-br from-success-500 to-error-500'
};

export const variants: { label: string; list: string[] }[] = [
	{
		label: 'Utility Classes',
		list: ['bg-initial', 'bg-transparent!']
	},
	// filled
	{
		label: 'Filled Variants',
		list: [
			'preset-filled',
			'preset-filled-surface-500',
			'preset-filled-primary-500',
			'preset-filled-secondary-500',
			'preset-filled-tertiary-500',
			'preset-filled-success-500',
			'preset-filled-warning-500',
			'preset-filled-error-500'
		]
	},
	// ghost
	{
		label: 'Ghost Variants',
		list: [
			'preset-tonal border border-surface-500',
			'preset-tonal-surface border border-surface-500',
			'preset-tonal-primary border border-primary-500',
			'preset-tonal-secondary border border-secondary-500',
			'preset-tonal-tertiary border border-tertiary-500',
			'preset-tonal-success border border-success-500',
			'preset-tonal-warning border border-warning-500',
			'preset-tonal-error border border-error-500'
		]
	},
	// soft
	{
		label: 'Soft Variants',
		list: [
			'preset-tonal',
			'preset-tonal-surface',
			'preset-tonal-primary',
			'preset-tonal-secondary',
			'preset-tonal-tertiary',
			'preset-tonal-success',
			'preset-tonal-warning',
			'preset-tonal-error'
		]
	},
	// ringed
	{
		label: 'Ringed Variants',
		list: [
			'preset-outlined',
			'preset-outlined-surface-500',
			'preset-outlined-primary-500',
			'preset-outlined-secondary-500',
			'preset-outlined-tertiary-500',
			'preset-outlined-success-500',
			'preset-outlined-warning-500',
			'preset-outlined-error-500'
		]
	},
	// gradient
	{
		label: 'Gradient Variants',
		list: [
			'bg-linear-to-br from-primary-500 to-secondary-500',
			'bg-linear-to-br from-secondary-500 to-tertiary-500',
			'bg-linear-to-br from-tertiary-500 to-primary-500',
			'bg-linear-to-br from-secondary-500 to-primary-500',
			'bg-linear-to-br from-tertiary-500 to-secondary-500',
			'bg-linear-to-br from-primary-500 to-tertiary-500',
			'bg-linear-to-br from-success-500 to-warning-500',
			'bg-linear-to-br from-warning-500 to-error-500',
			'bg-linear-to-br from-error-500 to-success-500',
			'bg-linear-to-br from-warning-500 to-success-500',
			'bg-linear-to-br from-error-500 to-warning-500',
			'bg-linear-to-br from-success-500 to-error-500'
		]
	}
];