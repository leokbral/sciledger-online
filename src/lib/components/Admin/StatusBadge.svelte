<script lang="ts">
	import { statusLabel } from '$lib/helpers/statusLabels';

	interface Props {
		status?: string | null;
		fallback?: string;
		/**
		 * Renders this instead of `status`.
		 *
		 * Needed because a paper declined by a hub carries `rejectedByHub: true` while its
		 * `status` can be left at whatever it was — real rows in this database do diverge,
		 * from a decline path that predates `transitionPaperStatus`. The rest of the app
		 * displays `rejectedByHub || status === 'rejected'` as "Paper Declined", so the
		 * admin area has to agree with it. Callers that pass this should also surface the
		 * stored status, so the divergence is visible rather than hidden.
		 */
		override?: string | null;
	}

	let { status, fallback = '—', override = null }: Props = $props();

	/** Tone is keyed on what is actually rendered. */
	let effective = $derived(override ?? status);

	/** Maps a lifecycle status onto a tone, without hardcoding every status string. */
	function toneFor(value: string) {
		const normalized = value.toLowerCase();

		if (['published', 'accepted', 'completed'].includes(normalized)) {
			return 'border-emerald-200 bg-emerald-50 text-emerald-800';
		}
		if (
			['rejected', 'declined', 'expired', 'cancelled', 'removed', 'blocked'].includes(normalized)
		) {
			return 'border-rose-200 bg-rose-50 text-rose-800';
		}
		if (['pending', 'draft', 'available', 'open'].includes(normalized)) {
			return 'border-slate-200 bg-slate-50 text-slate-700';
		}
		if (['overdue', 'past_due', 'delinquent', 'needing corrections'].includes(normalized)) {
			return 'border-amber-200 bg-amber-50 text-amber-800';
		}

		return 'border-sky-200 bg-sky-50 text-sky-800';
	}
</script>

{#if effective}
	<span
		class="inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium {toneFor(
			effective
		)}"
	>
		{statusLabel(effective)}
	</span>
{:else}
	<span class="text-xs text-slate-400">{fallback}</span>
{/if}
