import { describe, expect, it } from 'vitest';
import { isDeclinedStatus, statusLabel } from './statusLabels';

describe('statusLabel', () => {
	/**
	 * The product never says "Rejected" to a person --
	 * `src/lib/server/editorialDecisionLabels.test.ts` fails the build over it -- so the
	 * stored `rejected` must always surface as "Declined".
	 */
	it('renders the stored rejected status as Declined', () => {
		expect(statusLabel('rejected')).toBe('Declined');
	});

	it('renders a real declined status as Declined too', () => {
		expect(statusLabel('declined')).toBe('Declined');
	});

	it('never returns the word Rejected for any input casing', () => {
		for (const value of ['rejected', 'Rejected', 'REJECTED', '  rejected  ']) {
			expect(statusLabel(value)).toBe('Declined');
		}
	});

	it('title-cases multi-word paper statuses', () => {
		expect(statusLabel('reviewer assignment')).toBe('Reviewer Assignment');
		expect(statusLabel('awaiting final decision')).toBe('Awaiting Final Decision');
		expect(statusLabel('needing corrections')).toBe('Needing Corrections');
	});

	it('handles underscores and hyphens from billing and review statuses', () => {
		expect(statusLabel('past_due')).toBe('Past Due');
		expect(statusLabel('counter-proposal')).toBe('Counter Proposal');
	});

	it('title-cases single-word statuses', () => {
		expect(statusLabel('published')).toBe('Published');
		expect(statusLabel('pending')).toBe('Pending');
		expect(statusLabel('overdue')).toBe('Overdue');
	});

	it('returns an empty string for nothing, so callers can fall back', () => {
		expect(statusLabel(null)).toBe('');
		expect(statusLabel(undefined)).toBe('');
		expect(statusLabel('')).toBe('');
		expect(statusLabel('   ')).toBe('');
	});
});

describe('isDeclinedStatus', () => {
	it('recognises both stored spellings', () => {
		expect(isDeclinedStatus('rejected')).toBe(true);
		expect(isDeclinedStatus('declined')).toBe(true);
	});

	it('rejects everything else', () => {
		for (const value of ['published', 'accepted', 'in review', '', null, undefined]) {
			expect(isDeclinedStatus(value)).toBe(false);
		}
	});
});
