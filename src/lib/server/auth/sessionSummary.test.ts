import { describe, expect, it } from 'vitest';
import { toSessionSummary } from './sessionSummary';

function createRawSession(overrides: Record<string, unknown> = {}) {
	return {
		_id: 'session-1',
		id: 'redundant-id-field',
		userId: 'user-1',
		sessionTokenHash: 'a'.repeat(64),
		createdAt: new Date('2026-07-10T12:00:00.000Z'),
		updatedAt: new Date('2026-07-10T12:00:00.000Z'),
		lastActivityAt: new Date('2026-07-10T12:05:00.000Z'),
		expiresAt: new Date('2026-08-09T12:00:00.000Z'),
		rememberMe: true,
		ip: '203.0.113.10',
		userAgent: 'Mozilla/5.0',
		revokedAt: null,
		revokedReason: '',
		...overrides
	};
}

describe('toSessionSummary', () => {
	it('exposes only the seven documented fields', () => {
		const summary = toSessionSummary(createRawSession(), null);

		expect(Object.keys(summary).sort()).toEqual(
			[
				'createdAt',
				'currentSession',
				'expiresAt',
				'ip',
				'lastActivityAt',
				'rememberMe',
				'sessionId',
				'userAgent'
			].sort()
		);
	});

	it('never includes sessionTokenHash, revokedAt, revokedReason, or the raw Mongo id/userId fields', () => {
		const summary = toSessionSummary(createRawSession(), null) as Record<string, unknown>;

		expect(summary.sessionTokenHash).toBeUndefined();
		expect(summary.revokedAt).toBeUndefined();
		expect(summary.revokedReason).toBeUndefined();
		expect(summary.userId).toBeUndefined();
		expect(summary.id).toBeUndefined();
		expect(summary.updatedAt).toBeUndefined();
		expect(JSON.stringify(summary)).not.toContain('a'.repeat(64));
	});

	it('maps sessionId from _id', () => {
		const summary = toSessionSummary(createRawSession({ _id: 'abc-123' }), null);
		expect(summary.sessionId).toBe('abc-123');
	});

	it('marks currentSession true only when the token hash matches', () => {
		const session = createRawSession({ sessionTokenHash: 'match-hash' });

		expect(toSessionSummary(session, 'match-hash').currentSession).toBe(true);
		expect(toSessionSummary(session, 'other-hash').currentSession).toBe(false);
		expect(toSessionSummary(session, null).currentSession).toBe(false);
	});

	it('defaults userAgent and ip to empty strings when missing', () => {
		const summary = toSessionSummary(createRawSession({ userAgent: undefined, ip: undefined }), null);

		expect(summary.userAgent).toBe('');
		expect(summary.ip).toBe('');
	});
});
