import { beforeEach, describe, expect, it } from 'vitest';
import {
	MAX_ACTIVE_SESSIONS,
	REMEMBER_ME_DURATION,
	SESSION_DURATION,
	SESSION_RENEW_THRESHOLD,
	SESSION_TOUCH_THROTTLE,
	createSessionService,
	hashSessionToken,
	isExpired,
	shouldRenew,
	shouldTouchSession
} from './SessionService';

type MockSession = {
	_id: string;
	id: string;
	userId: string;
	sessionTokenHash: string;
	createdAt: Date;
	updatedAt: Date;
	lastActivityAt: Date;
	expiresAt: Date;
	rememberMe: boolean;
	ip?: string;
	userAgent?: string;
	revokedAt?: Date | null;
	revokedReason?: string;
	save: () => Promise<MockSession>;
};

function createMockSessionModel() {
	const sessions: MockSession[] = [];
	let sequence = 0;

	function createDocument(data: Record<string, unknown>) {
		sequence += 1;
		const session: MockSession = {
			_id: String(data._id || `doc-${sequence}`),
			id: String(data.id || `session-${sequence}`),
			userId: String(data.userId),
			sessionTokenHash: String(data.sessionTokenHash),
			createdAt: new Date(data.createdAt as Date),
			updatedAt: new Date(data.updatedAt as Date),
			lastActivityAt: new Date(data.lastActivityAt as Date),
			expiresAt: new Date(data.expiresAt as Date),
			rememberMe: Boolean(data.rememberMe),
			ip: String(data.ip || ''),
			userAgent: String(data.userAgent || ''),
			revokedAt: (data.revokedAt as Date | null | undefined) ?? null,
			revokedReason: String(data.revokedReason || ''),
			async save() {
				return session;
			}
		};
		sessions.push(session);
		return session;
	}

	return {
		sessions,
		model: {
			async create(data: Record<string, unknown>) {
				return createDocument(data);
			},
			async findOne(query: Record<string, unknown>) {
				if (typeof query.sessionTokenHash === 'string') {
					return sessions.find((session) => session.sessionTokenHash === query.sessionTokenHash) ?? null;
				}

				if (typeof query._id === 'string') {
					return (
						sessions.find(
							(session) =>
								session._id === query._id && (!query.userId || session.userId === query.userId)
						) ?? null
					);
				}

				return null;
			},
			async updateMany(query: Record<string, unknown>, update: Record<string, unknown>) {
				const set = (update.$set || {}) as Partial<MockSession>;
				const excludeId = (query._id as { $ne?: unknown } | undefined)?.$ne;
				const matchingSessions = sessions.filter((session) => {
					if (query.userId && session.userId !== query.userId) return false;
					if ('revokedAt' in query && session.revokedAt !== query.revokedAt) return false;
					if (excludeId !== undefined && session._id === String(excludeId)) return false;
					return true;
				});

				for (const session of matchingSessions) {
					Object.assign(session, set);
				}

				return {
					matchedCount: matchingSessions.length,
					modifiedCount: matchingSessions.length
				};
			},
			find(query: Record<string, unknown>) {
				const matches = sessions.filter((session) => {
					if (query.userId && session.userId !== query.userId) return false;
					if ('revokedAt' in query && session.revokedAt !== query.revokedAt) return false;
					const expiresAtQuery = query.expiresAt as { $gt?: Date } | undefined;
					if (expiresAtQuery?.$gt && !(session.expiresAt.getTime() > expiresAtQuery.$gt.getTime())) {
						return false;
					}
					return true;
				});

				return {
					async sort(sortSpec: Record<string, 1 | -1>) {
						const [[field, direction]] = Object.entries(sortSpec);
						return [...matches].sort((a, b) => {
							const aTime = (a[field as keyof MockSession] as Date).getTime();
							const bTime = (b[field as keyof MockSession] as Date).getTime();
							return direction === 1 ? aTime - bTime : bTime - aTime;
						});
					}
				};
			},
			async deleteMany(query: Record<string, unknown>) {
				const idQuery = query._id as { $in?: unknown[] } | undefined;
				const idsToDelete = new Set((idQuery?.$in ?? []).map(String));
				const before = sessions.length;

				for (let index = sessions.length - 1; index >= 0; index -= 1) {
					if (idsToDelete.has(String(sessions[index]._id))) {
						sessions.splice(index, 1);
					}
				}

				return { deletedCount: before - sessions.length };
			}
		}
	};
}

describe('SessionService', () => {
	let sessionModel: ReturnType<typeof createMockSessionModel>;
	let service: ReturnType<typeof createSessionService<MockSession>>;

	beforeEach(() => {
		sessionModel = createMockSessionModel();
		service = createSessionService(sessionModel.model);
	});

	it('creates a session and stores only the token hash', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { session, sessionToken } = await service.createSession(
			{
				userId: 'user-1',
				rememberMe: true,
				ip: '127.0.0.1',
				userAgent: 'Vitest'
			},
			{ now }
		);

		expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);
		expect(session.sessionTokenHash).toBe(hashSessionToken(sessionToken));
		expect(session.sessionTokenHash).not.toBe(sessionToken);
		expect(session.userId).toBe('user-1');
		expect(session.rememberMe).toBe(true);
		expect(session.ip).toBe('127.0.0.1');
		expect(session.userAgent).toBe('Vitest');
		expect(session.createdAt).toEqual(now);
		expect(session.lastActivityAt).toEqual(now);
		expect(session.expiresAt).toEqual(new Date(now.getTime() + REMEMBER_ME_DURATION));
		expect('sessionToken' in session).toBe(false);
	});

	it('uses the normal session duration when rememberMe is false', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { session } = await service.createSession(
			{
				userId: 'user-1',
				rememberMe: false
			},
			{ now }
		);

		expect(session.rememberMe).toBe(false);
		expect(session.expiresAt).toEqual(new Date(now.getTime() + SESSION_DURATION));
	});

	it('validates an active session token', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { sessionToken } = await service.createSession({ userId: 'user-1' }, { now });

		const session = await service.validateSession(sessionToken, {
			now: new Date(now.getTime() + SESSION_DURATION - 1000)
		});

		expect(session?.userId).toBe('user-1');
		expect(await service.validateSession('not-a-real-token', { now })).toBeNull();
	});

	it('rejects expired sessions', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { sessionToken } = await service.createSession(
			{
				userId: 'user-1',
				expiresAt: new Date(now.getTime() + 1000)
			},
			{ now }
		);

		const session = await service.validateSession(sessionToken, {
			now: new Date(now.getTime() + 1001)
		});

		expect(session).toBeNull();
		expect(isExpired(sessionModel.sessions[0], { now: new Date(now.getTime() + 1001) })).toBe(true);
		expect(shouldRenew(sessionModel.sessions[0], { now: new Date(now.getTime() + 1001) })).toBe(false);
	});

	it('revokes a single session and all sessions for a user', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const first = await service.createSession({ userId: 'user-1' }, { now });
		const second = await service.createSession({ userId: 'user-1' }, { now });
		const third = await service.createSession({ userId: 'user-2' }, { now });

		const revokedAt = new Date(now.getTime() + 1000);
		const revoked = await service.revokeSession(first.sessionToken, 'logout', { now: revokedAt });

		expect(revoked?.revokedAt).toEqual(revokedAt);
		expect(revoked?.revokedReason).toBe('logout');
		expect(await service.validateSession(first.sessionToken, { now: revokedAt })).toBeNull();
		expect(shouldRenew(revoked!, { now: revokedAt })).toBe(false);

		const result = await service.revokeAllUserSessions('user-1', 'security', {
			now: new Date(now.getTime() + 2000)
		});

		expect(result.modifiedCount).toBe(1);
		expect(await service.validateSession(second.sessionToken, { now })).toBeNull();
		expect(await service.validateSession(third.sessionToken, { now })).not.toBeNull();
	});

	it('keeps every session when a user is at or under MAX_ACTIVE_SESSIONS', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');

		for (let i = 0; i < MAX_ACTIVE_SESSIONS; i += 1) {
			await service.createSession(
				{ userId: 'user-1' },
				{ now: new Date(now.getTime() + i * 1000) }
			);
		}

		const remaining = sessionModel.sessions.filter((session) => session.userId === 'user-1');
		expect(remaining).toHaveLength(MAX_ACTIVE_SESSIONS);
	});

	it('deletes the oldest active sessions once a user exceeds MAX_ACTIVE_SESSIONS', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const created: Awaited<ReturnType<typeof service.createSession>>[] = [];

		for (let i = 0; i < MAX_ACTIVE_SESSIONS + 3; i += 1) {
			created.push(
				await service.createSession(
					{ userId: 'user-1' },
					{ now: new Date(now.getTime() + i * 1000) }
				)
			);
		}

		const remaining = sessionModel.sessions.filter((session) => session.userId === 'user-1');
		expect(remaining).toHaveLength(MAX_ACTIVE_SESSIONS);

		// The 3 oldest sessions (created first) must have been deleted.
		for (let i = 0; i < 3; i += 1) {
			const oldestSessionId = created[i].session._id;
			expect(remaining.some((session) => session._id === oldestSessionId)).toBe(false);
			expect(await service.validateSession(created[i].sessionToken, { now })).toBeNull();
		}

		// The remaining (newest) sessions must still be present and valid.
		for (let i = 3; i < created.length; i += 1) {
			const survivingSessionId = created[i].session._id;
			expect(remaining.some((session) => session._id === survivingSessionId)).toBe(true);
		}
	});

	it('never deletes the session that was just created, even far past the limit', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');

		for (let i = 0; i < MAX_ACTIVE_SESSIONS + 10; i += 1) {
			const { sessionToken, session } = await service.createSession(
				{ userId: 'user-1' },
				{ now: new Date(now.getTime() + i * 1000) }
			);

			// Immediately after creation, the just-created session must always
			// still validate -- it can never be among the ones trimmed away.
			const validated = await service.validateSession(sessionToken, {
				now: new Date(now.getTime() + i * 1000)
			});
			expect(validated?._id).toBe(session._id);
		}

		expect(
			sessionModel.sessions.filter((session) => session.userId === 'user-1')
		).toHaveLength(MAX_ACTIVE_SESSIONS);
	});

	it('still revokes all sessions for a user after the active-session limit has trimmed old ones', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');

		for (let i = 0; i < MAX_ACTIVE_SESSIONS + 4; i += 1) {
			await service.createSession(
				{ userId: 'user-1' },
				{ now: new Date(now.getTime() + i * 1000) }
			);
		}
		const otherUserSession = await service.createSession({ userId: 'user-2' }, { now });

		const result = await service.revokeAllUserSessions('user-1', 'security', {
			now: new Date(now.getTime() + 100000)
		});

		expect(result.matchedCount).toBe(MAX_ACTIVE_SESSIONS);
		expect(
			sessionModel.sessions
				.filter((session) => session.userId === 'user-1')
				.every((session) => session.revokedAt !== null)
		).toBe(true);
		expect(await service.validateSession(otherUserSession.sessionToken, { now })).not.toBeNull();
	});

	it('lists only active sessions for a user, newest activity first', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const first = await service.createSession({ userId: 'user-1' }, { now });
		const second = await service.createSession(
			{ userId: 'user-1' },
			{ now: new Date(now.getTime() + 1000) }
		);
		await service.createSession({ userId: 'user-2' }, { now });
		const expiredSoon = await service.createSession(
			{ userId: 'user-1', expiresAt: new Date(now.getTime() + 500) },
			{ now }
		);

		// Bump second's activity so it should sort before first.
		await service.touchSession(second.sessionToken, { now: new Date(now.getTime() + 5000) });

		const active = await service.listActiveSessions('user-1', { now: new Date(now.getTime() + 2000) });

		expect(active.map((session) => session._id)).toEqual([second.session._id, first.session._id]);
		expect(active.some((session) => session._id === expiredSoon.session._id)).toBe(false);
	});

	it('excludes revoked sessions from listActiveSessions', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { session, sessionToken } = await service.createSession({ userId: 'user-1' }, { now });
		await service.revokeSession(sessionToken, 'user_revoked', { now });

		const active = await service.listActiveSessions('user-1', { now });

		expect(active.some((s) => s._id === session._id)).toBe(false);
	});

	it('revokes a session by id only when it belongs to the requesting user', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { session } = await service.createSession({ userId: 'user-1' }, { now });

		const wrongUserAttempt = await service.revokeSessionById(String(session._id), 'user-2', 'user_revoked', {
			now
		});
		expect(wrongUserAttempt).toBeNull();

		const revoked = await service.revokeSessionById(String(session._id), 'user-1', 'user_revoked', { now });
		expect(revoked?.revokedAt).toEqual(now);
		expect(revoked?.revokedReason).toBe('user_revoked');

		const stillActive = await service.listActiveSessions('user-1', { now });
		expect(stillActive.some((s) => s._id === session._id)).toBe(false);
	});

	it('returns null from revokeSessionById for an unknown session id', async () => {
		const result = await service.revokeSessionById('does-not-exist', 'user-1');
		expect(result).toBeNull();
	});

	it('revokes every active session for a user except the one given by id', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const kept = await service.createSession({ userId: 'user-1' }, { now });
		const revokedFirst = await service.createSession({ userId: 'user-1' }, { now });
		const revokedSecond = await service.createSession({ userId: 'user-1' }, { now });
		const otherUser = await service.createSession({ userId: 'user-2' }, { now });

		const result = await service.revokeAllUserSessionsExcept(
			'user-1',
			String(kept.session._id),
			'user_revoked_all_except_current',
			{ now: new Date(now.getTime() + 1000) }
		);

		expect(result.modifiedCount).toBe(2);
		expect(await service.validateSession(kept.sessionToken, { now })).not.toBeNull();
		expect(await service.validateSession(revokedFirst.sessionToken, { now })).toBeNull();
		expect(await service.validateSession(revokedSecond.sessionToken, { now })).toBeNull();
		expect(await service.validateSession(otherUser.sessionToken, { now })).not.toBeNull();
	});

	it('renews and touches an active session', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const { sessionToken } = await service.createSession({ userId: 'user-1' }, { now });
		const renewedExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
		const renewedAt = new Date(now.getTime() + 60 * 1000);

		const renewed = await service.renewSession(
			sessionToken,
			{ expiresAt: renewedExpiresAt, rememberMe: true },
			{ now: renewedAt }
		);

		expect(renewed?.expiresAt).toEqual(renewedExpiresAt);
		expect(renewed?.rememberMe).toBe(true);
		expect(renewed?.updatedAt).toEqual(renewedAt);

		const touchedAt = new Date(now.getTime() + 120 * 1000);
		const touched = await service.touchSession(sessionToken, { now: touchedAt });

		expect(touched?.lastActivityAt).toEqual(touchedAt);
		expect(touched?.updatedAt).toEqual(touchedAt);
	});

	it('automatically renews a normal session inside the renewal threshold', async () => {
		const createdAt = new Date('2026-07-03T12:00:00.000Z');
		const now = new Date(createdAt.getTime() + 23 * 24 * 60 * 60 * 1000);
		const { session, sessionToken } = await service.createSession(
			{ userId: 'user-1', rememberMe: false },
			{ now: createdAt }
		);
		const originalCreatedAt = new Date(session.createdAt);
		session.expiresAt = new Date(now.getTime() + SESSION_RENEW_THRESHOLD - 1);

		expect(shouldRenew(session, { now })).toBe(true);

		const renewed = await service.renewIfNecessary(sessionToken, { now });

		expect(renewed?.expiresAt).toEqual(new Date(now.getTime() + SESSION_DURATION));
		expect(renewed?.updatedAt).toEqual(now);
		expect(renewed?.createdAt).toEqual(originalCreatedAt);
	});

	it('does not renew before the renewal threshold', async () => {
		const createdAt = new Date('2026-07-03T12:00:00.000Z');
		const now = new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
		const { session, sessionToken } = await service.createSession(
			{ userId: 'user-1', rememberMe: false },
			{ now: createdAt }
		);
		const originalExpiresAt = new Date(now.getTime() + SESSION_RENEW_THRESHOLD + 1);
		const originalUpdatedAt = new Date(session.updatedAt);
		session.expiresAt = originalExpiresAt;

		expect(shouldRenew(session, { now })).toBe(false);

		const renewed = await service.renewIfNecessary(sessionToken, { now });

		expect(renewed?.expiresAt).toEqual(originalExpiresAt);
		expect(renewed?.updatedAt).toEqual(originalUpdatedAt);
	});

	it('automatically renews rememberMe sessions using the rememberMe duration', async () => {
		const createdAt = new Date('2026-07-03T12:00:00.000Z');
		const now = new Date(createdAt.getTime() + 84 * 24 * 60 * 60 * 1000);
		const { session, sessionToken } = await service.createSession(
			{ userId: 'user-1', rememberMe: true },
			{ now: createdAt }
		);
		session.expiresAt = new Date(now.getTime() + SESSION_RENEW_THRESHOLD - 1);

		const renewed = await service.renewIfNecessary(sessionToken, { now });

		expect(renewed?.rememberMe).toBe(true);
		expect(renewed?.expiresAt).toEqual(new Date(now.getTime() + REMEMBER_ME_DURATION));
	});

	it('only marks a session as touchable after the activity throttle window', () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const session = {
			lastActivityAt: now
		};

		expect(
			shouldTouchSession(session, {
				now: new Date(now.getTime() + SESSION_TOUCH_THROTTLE - 1)
			})
		).toBe(false);
		expect(
			shouldTouchSession(session, {
				now: new Date(now.getTime() + SESSION_TOUCH_THROTTLE)
			})
		).toBe(true);
	});
});
