import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	findSession: vi.fn(),
	revokeAllUserSessionsExcept: vi.fn()
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/server/auth/SessionService', () => ({
	findSession: mocks.findSession,
	revokeAllUserSessionsExcept: mocks.revokeAllUserSessionsExcept
}));

function createEvent(options: { cookieHeader?: string | null; authenticated?: boolean } = {}) {
	const { cookieHeader = 'session=my-current-token', authenticated = true } = options;
	return {
		request: {
			headers: {
				get: (name: string) => (name.toLowerCase() === 'cookie' ? cookieHeader : null)
			}
		},
		locals: authenticated ? { user: { id: 'user-1' } } : {}
	} as any;
}

describe('POST /api/account/sessions/revoke-all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ authenticated: false }));

		expect(response.status).toBe(401);
		expect(mocks.revokeAllUserSessionsExcept).not.toHaveBeenCalled();
	});

	it('requires an active current session', async () => {
		mocks.findSession.mockResolvedValue(null);
		const { POST } = await import('./+server');

		const response = await POST(createEvent({ cookieHeader: null }));
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBeTruthy();
		expect(mocks.revokeAllUserSessionsExcept).not.toHaveBeenCalled();
	});

	it('revokes every other session, excluding the current one, and reports the count', async () => {
		mocks.findSession.mockResolvedValue({ _id: 'current-session-id' });
		mocks.revokeAllUserSessionsExcept.mockResolvedValue({ matchedCount: 3, modifiedCount: 3 });
		const { POST } = await import('./+server');

		const response = await POST(createEvent());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mocks.revokeAllUserSessionsExcept).toHaveBeenCalledWith('user-1', 'current-session-id');
		expect(body).toEqual({ success: true, revokedCount: 3 });
	});
});
