import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	startMongo: vi.fn(),
	revokeSessionById: vi.fn(),
	hashSessionToken: vi.fn((token: string) => `hash(${token})`)
}));

vi.mock('$lib/db/mongooseConnection', () => ({
	start_mongo: mocks.startMongo
}));

vi.mock('$lib/server/auth/SessionService', () => ({
	revokeSessionById: mocks.revokeSessionById,
	hashSessionToken: mocks.hashSessionToken
}));

function createEvent(options: {
	id?: string;
	cookieHeader?: string | null;
	authenticated?: boolean;
}) {
	const { id = 'session-1', cookieHeader = null, authenticated = true } = options;
	return {
		params: { id },
		request: {
			headers: {
				get: (name: string) => (name.toLowerCase() === 'cookie' ? cookieHeader : null)
			}
		},
		url: new URL('https://sciledger.online/api/account/sessions/' + id),
		locals: authenticated ? { user: { id: 'user-1' } } : {}
	} as any;
}

describe('DELETE /api/account/sessions/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.startMongo.mockResolvedValue(undefined);
	});

	it('requires authentication', async () => {
		const { DELETE } = await import('./+server');

		const response = await DELETE(createEvent({ authenticated: false }));

		expect(response.status).toBe(401);
		expect(mocks.revokeSessionById).not.toHaveBeenCalled();
	});

	it('revokes only the targeted session, scoped to the authenticated user', async () => {
		mocks.revokeSessionById.mockResolvedValue({
			_id: 'session-1',
			sessionTokenHash: 'hash(some-other-devices-token)'
		});
		const { DELETE } = await import('./+server');

		const response = await DELETE(createEvent({ id: 'session-1' }));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mocks.revokeSessionById).toHaveBeenCalledWith('session-1', 'user-1', 'user_revoked');
		expect(body).toEqual({ success: true, currentSession: false });
	});

	it('returns 404 for a session that does not exist or does not belong to the user', async () => {
		mocks.revokeSessionById.mockResolvedValue(null);
		const { DELETE } = await import('./+server');

		const response = await DELETE(createEvent({ id: 'someone-elses-session' }));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeTruthy();
	});

	it('clears the session cookie and reports currentSession: true when revoking the caller\'s own session', async () => {
		mocks.revokeSessionById.mockResolvedValue({
			_id: 'session-1',
			sessionTokenHash: 'hash(my-current-token)'
		});
		const { DELETE } = await import('./+server');

		const response = await DELETE(
			createEvent({ id: 'session-1', cookieHeader: 'session=my-current-token' })
		);
		const body = await response.json();

		expect(body).toEqual({ success: true, currentSession: true });
		const setCookie = response.headers.get('set-cookie') || '';
		expect(setCookie).toMatch(/session=deleted/);
		expect(setCookie.toLowerCase()).toMatch(/expires=/);
	});

	it('does not clear the cookie when revoking a different device\'s session', async () => {
		mocks.revokeSessionById.mockResolvedValue({
			_id: 'session-2',
			sessionTokenHash: 'hash(other-device-token)'
		});
		const { DELETE } = await import('./+server');

		const response = await DELETE(
			createEvent({ id: 'session-2', cookieHeader: 'session=my-current-token' })
		);

		expect(response.headers.get('set-cookie')).toBeNull();
	});
});
