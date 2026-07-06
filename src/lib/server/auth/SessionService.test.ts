import { beforeEach, describe, expect, it } from 'vitest';
import {
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
		const session: MockSession = {
			id: String(data.id || `session-${++sequence}`),
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

				return null;
			},
			async updateMany(query: Record<string, unknown>, update: Record<string, unknown>) {
				const set = (update.$set || {}) as Partial<MockSession>;
				const matchingSessions = sessions.filter((session) => {
					if (query.userId && session.userId !== query.userId) return false;
					if ('revokedAt' in query && session.revokedAt !== query.revokedAt) return false;
					return true;
				});

				for (const session of matchingSessions) {
					Object.assign(session, set);
				}

				return {
					matchedCount: matchingSessions.length,
					modifiedCount: matchingSessions.length
				};
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
