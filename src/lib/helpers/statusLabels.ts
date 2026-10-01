/**
 * Display labels for lifecycle statuses.
 *
 * The database stores `rejected` for a paper the hub turned down, but the product
 * vocabulary is "Declined": `src/lib/server/editorialDecisionLabels.test.ts` fails the
 * build if any Svelte file renders "Reject" or "Rejected" as UI text. Anything that
 * shows a status to a person must therefore translate it rather than print the raw
 * column value.
 *
 * `declined` is also a real status in its own right on review assignments and
 * invitations, so both keys map to the same label.
 */
const STATUS_LABEL_OVERRIDES: Record<string, string> = {
	rejected: 'Declined',
	declined: 'Declined'
};

/** `past_due` -> `Past Due`, `in review` -> `In Review`, `counter-proposal` -> `Counter Proposal`. */
function titleCase(value: string) {
	return value
		.split(/[\s_-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Turns any stored status into something readable, applying the product vocabulary
 * first. Safe for paper, review-assignment, invitation, hub and billing statuses.
 */
export function statusLabel(status: unknown): string {
	const raw = String(status ?? '').trim();
	if (!raw) return '';

	const key = raw.toLowerCase();
	return STATUS_LABEL_OVERRIDES[key] ?? titleCase(key);
}

/**
 * True when a status string is one the product calls "Declined". Does NOT cover a
 * paper declined through the `rejectedByHub` flag with a different status — use the
 * `declined` field the admin queries compute for that.
 */
export function isDeclinedStatus(status: unknown): boolean {
	const key = String(status ?? '')
		.trim()
		.toLowerCase();
	return key === 'rejected' || key === 'declined';
}
