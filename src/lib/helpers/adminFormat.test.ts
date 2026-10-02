import { describe, expect, it } from 'vitest';
import { formatAdminLoginDate } from './adminFormat';

describe('admin login dates', () => {
	it('formats the same Brasília date and time on the server and client', () => {
		expect(formatAdminLoginDate('2026-10-02T02:30:00Z')).toBe('1 Oct 2026, 23:30');
	});

	it.each([null, undefined, '', 'invalid'])('labels unavailable dates without inventing a login: %s', (value) => {
		expect(formatAdminLoginDate(value)).toBe('No login recorded');
	});
});
