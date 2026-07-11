import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	listActiveSessions: vi.fn(),
	hashSessionToken: vi.fn((token: string) => `hash(${token})`)
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/server/auth/SessionService', () => ({
	listActiveSessions: mocks.listActiveSessions,
	hashSessionToken: mocks.hashSessionToken
}));

function createEvent(options: { cookieHeader?: string | null; userId?: string } = {}) {
	const { cookieHeader = null, userId = 'user-1' } = options;
	return {
		request: {
			headers: {
				get: (name: string) => (name.toLowerCase() === 'cookie' ? cookieHeader : null)
			}
		},
		locals: userId ? { user: { id: userId } } : {}
	} as any;
}

describe('settings/security +page.server.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('returns an empty session list when unauthenticated (defensive -- the layout already guards this)', async () => {
		const { load } = await import('./+page.server');

		const result = await load(createEvent({ userId: '' }));

		expect(result).toEqual({ sessions: [] });
		expect(mocks.listActiveSessions).not.toHaveBeenCalled();
	});

	it('loads active sessions for the authenticated user and marks the current one', async () => {
		mocks.listActiveSessions.mockResolvedValue([
			{
				_id: 'session-1',
				sessionTokenHash: 'hash(current-token)',
				createdAt: new Date('2026-07-10T12:00:00.000Z'),
				lastActivityAt: new Date('2026-07-10T12:05:00.000Z'),
				expiresAt: new Date('2026-08-09T12:00:00.000Z'),
				rememberMe: true,
				userAgent: 'Mozilla/5.0',
				ip: '203.0.113.10'
			},
			{
				_id: 'session-2',
				sessionTokenHash: 'hash(other-token)',
				createdAt: new Date('2026-07-09T12:00:00.000Z'),
				lastActivityAt: new Date('2026-07-09T12:05:00.000Z'),
				expiresAt: new Date('2026-08-08T12:00:00.000Z'),
				rememberMe: false,
				userAgent: 'Firefox',
				ip: '198.51.100.20'
			}
		]);
		const { load } = await import('./+page.server');

		const result = (await load(createEvent({ cookieHeader: 'session=current-token' }))) as {
			sessions: { currentSession: boolean }[];
		};

		expect(mocks.listActiveSessions).toHaveBeenCalledWith('user-1');
		expect(result.sessions).toHaveLength(2);
		expect(result.sessions[0].currentSession).toBe(true);
		expect(result.sessions[1].currentSession).toBe(false);
		// Never leaks the hash used to compute currentSession.
		expect(JSON.stringify(result)).not.toMatch(/hash\(/);
	});

	it('marks no session as current when there is no session cookie', async () => {
		mocks.listActiveSessions.mockResolvedValue([
			{
				_id: 'session-1',
				sessionTokenHash: 'hash(x)',
				createdAt: new Date(),
				lastActivityAt: new Date(),
				expiresAt: new Date(),
				rememberMe: false,
				userAgent: '',
				ip: ''
			}
		]);
		const { load } = await import('./+page.server');

		const result = (await load(createEvent())) as { sessions: { currentSession: boolean }[] };

		expect(result.sessions[0].currentSession).toBe(false);
	});
});
