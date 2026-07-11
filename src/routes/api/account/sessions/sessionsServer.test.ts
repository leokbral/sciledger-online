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

function createEvent(cookieHeader: string | null, authenticated = true) {
	return {
		request: {
			headers: {
				get: (name: string) => (name.toLowerCase() === 'cookie' ? cookieHeader : null)
			}
		},
		locals: authenticated ? { user: { id: 'user-1' } } : {}
	} as any;
}

describe('GET /api/account/sessions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { GET } = await import('./+server');

		const response = await GET(createEvent(null, false));

		expect(response.status).toBe(401);
		expect(mocks.listActiveSessions).not.toHaveBeenCalled();
	});

	it('returns only the documented safe fields, marking the matching session as current', async () => {
		mocks.listActiveSessions.mockResolvedValue([
			{
				_id: 'session-1',
				sessionTokenHash: 'hash(current-token)',
				createdAt: new Date('2026-07-10T12:00:00.000Z'),
				lastActivityAt: new Date('2026-07-10T12:05:00.000Z'),
				expiresAt: new Date('2026-08-09T12:00:00.000Z'),
				rememberMe: true,
				userAgent: 'Mozilla/5.0',
				ip: '203.0.113.10',
				revokedAt: null
			},
			{
				_id: 'session-2',
				sessionTokenHash: 'hash(other-token)',
				createdAt: new Date('2026-07-09T12:00:00.000Z'),
				lastActivityAt: new Date('2026-07-09T12:05:00.000Z'),
				expiresAt: new Date('2026-08-08T12:00:00.000Z'),
				rememberMe: false,
				userAgent: 'Firefox',
				ip: '198.51.100.20',
				revokedAt: null
			}
		]);
		const { GET } = await import('./+server');

		const response = await GET(createEvent('session=current-token'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mocks.listActiveSessions).toHaveBeenCalledWith('user-1');
		expect(body.sessions).toHaveLength(2);
		expect(body.sessions[0]).toEqual({
			sessionId: 'session-1',
			createdAt: '2026-07-10T12:00:00.000Z',
			lastActivityAt: '2026-07-10T12:05:00.000Z',
			expiresAt: '2026-08-09T12:00:00.000Z',
			rememberMe: true,
			currentSession: true,
			userAgent: 'Mozilla/5.0',
			ip: '203.0.113.10'
		});
		expect(body.sessions[1].currentSession).toBe(false);

		const rawBody = JSON.stringify(body);
		expect(rawBody).not.toMatch(/hash\(/);
		expect(rawBody).not.toContain('revokedAt');
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
				ip: '',
				revokedAt: null
			}
		]);
		const { GET } = await import('./+server');

		const response = await GET(createEvent(null));
		const body = await response.json();

		expect(body.sessions[0].currentSession).toBe(false);
	});
});
