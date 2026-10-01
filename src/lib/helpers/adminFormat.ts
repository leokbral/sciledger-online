/**
 * Date formatting for the administration screens.
 *
 * Records reach the client in mixed shapes: `User`, `Hub` and `Paper` store
 * `createdAt` as an ISO string, while `ReviewAssignment`, `PaperReviewInvitation`
 * and `ActivityEvent` store real Dates that serialize to ISO strings. Both arrive
 * as strings, so one parser covers every screen.
 */
export function formatAdminDate(value: unknown): string {
	if (!value) return '—';

	const date = value instanceof Date ? value : new Date(String(value));
	if (Number.isNaN(date.getTime())) return '—';

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	});
}

export function formatAdminDateTime(value: unknown): string {
	if (!value) return '—';

	const date = value instanceof Date ? value : new Date(String(value));
	if (Number.isNaN(date.getTime())) return '—';

	return date.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** Truncates long free text (paper titles) for table cells without breaking words mid-stream. */
export function truncate(value: unknown, maxLength = 80): string {
	const text = String(value ?? '').trim();
	if (!text) return '—';
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
