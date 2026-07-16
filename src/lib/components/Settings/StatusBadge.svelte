<script lang="ts">
	type Tone = 'success' | 'warning' | 'error' | 'primary' | 'neutral';

	interface Props {
		label: string;
		tone?: Tone;
		variant?: 'filled' | 'outlined';
		class?: string;
	}

	let { label, tone = 'neutral', variant = 'filled', class: className = '' }: Props = $props();

	const filled: Record<Tone, string> = {
		success: 'preset-filled-success-500',
		warning: 'preset-filled-warning-500',
		error: 'preset-filled-error-500',
		primary: 'preset-filled-primary-500',
		neutral: 'preset-tonal'
	};

	const outlined: Record<Tone, string> = {
		success: 'preset-outlined-success-500',
		warning: 'preset-outlined-warning-500',
		error: 'preset-outlined-error-500',
		primary: 'preset-outlined-primary-500',
		neutral: 'preset-outlined-surface-500'
	};

	const preset = $derived(variant === 'outlined' ? outlined[tone] : filled[tone]);
</script>

<span class="badge text-xs {preset} {className}">{label}</span>
