<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		/** UUID do paper (paper.id). */
		paperId: string;
		/** Só artigos publicados podem ser exportados; o botão some nos demais estados. */
		status?: string;
		class?: string;
	}

	let { paperId, status = 'published', class: className = '' }: Props = $props();

	const TEMPLATES = [
		{ id: 'v3-1col', label: 'Editorial · one column' },
		{ id: 'v2-1col', label: 'Modern · one column' },
		{ id: 'v2-2col', label: 'Modern · two columns' },
		{ id: 'v1', label: 'Classic' }
	];

	let template = $state('v3-1col');
	let href = $derived(`/api/papers/${paperId}/pdf?template=${template}`);
</script>

{#if paperId && status === 'published'}
	<div class={`flex flex-wrap items-center gap-2 ${className}`}>
		<a
			{href}
			data-sveltekit-reload
			class="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary-700"
			title="Download this article as a SciLedger-formatted PDF"
		>
			<Icon icon="mdi:file-pdf-box" width="18" height="18" />
			Download PDF
		</a>

		<a
			href={`${href}&inline=1`}
			target="_blank"
			rel="noopener"
			data-sveltekit-reload
			class="inline-flex items-center gap-1.5 rounded-full border border-surface-300 px-3 py-1.5 text-sm text-surface-700 transition hover:bg-surface-100"
			title="Open the formatted PDF in a new tab"
		>
			<Icon icon="mdi:open-in-new" width="16" height="16" />
			Preview
		</a>

		<label class="sr-only" for={`pdf-template-${paperId}`}>PDF template</label>
		<select
			id={`pdf-template-${paperId}`}
			bind:value={template}
			class="rounded-full border border-surface-300 bg-white px-3 py-1.5 text-xs text-surface-600"
		>
			{#each TEMPLATES as option}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	</div>
{/if}
