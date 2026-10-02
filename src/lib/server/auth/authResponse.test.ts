import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REMEMBER_ME_DURATION, SESSION_DURATION } from './sessionConstants';
import { respondWithSession } from './authResponse';

const mocks = vi.hoisted(() => ({ updateOne: vi.fn(), aggregate: vi.fn() }));
vi.mock('$lib/db/models/User', () => ({ default: { updateOne: mocks.updateOne } }));
vi.mock('$lib/db/models/UserSession', () => ({ default: { aggregate: mocks.aggregate } }));

function createRequest() {
	return new Request('https://sciledger.online/login', {
		headers: {
			'user-agent': 'Vitest',
			'x-forwarded-for': '127.0.0.1'
		}
	});
}

function getSessionCookie(response: Response) {
	return response.headers.get('set-cookie') || '';
}

describe('authenticated response session cookie', () => {
	beforeEach(() => {
		mocks.updateOne.mockReset().mockResolvedValue({ modifiedCount: 1 });
		mocks.aggregate.mockReset().mockResolvedValue([]);
	});

	it('creates a normal login session with a 30 day cookie', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const createSession = vi.fn(
			async (input: { userId: string; rememberMe: boolean; ip: string; userAgent: string }) => ({
				sessionToken: 'normal-session-token',
				session: {
					createdAt: now,
					expiresAt: new Date(now.getTime() + SESSION_DURATION)
				}
			})
		);

		const response = await respondWithSession(
			{
				user: {
					id: 'user-1',
					email: 'user@example.com'
				}
			},
			{
				request: createRequest(),
				url: new URL('https://sciledger.online/login'),
				rememberMe: false
			},
			createSession
		);

		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				rememberMe: false
			})
		);
		expect(getSessionCookie(response)).toContain('session=normal-session-token');
		expect(mocks.updateOne).toHaveBeenCalledWith(
			{ $or: [{ id: 'user-1' }, { _id: 'user-1' }] },
			{ $min: { firstLoginAt: now }, $max: { lastLoginAt: now } }
		);
		expect(getSessionCookie(response)).not.toContain('jwt=');
		expect(getSessionCookie(response)).toContain(
			`Expires=${new Date(now.getTime() + SESSION_DURATION).toUTCString()}`
		);
	});

	it('creates a rememberMe login session with a 90 day cookie', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const createSession = vi.fn(
			async (input: { userId: string; rememberMe: boolean; ip: string; userAgent: string }) => ({
				sessionToken: 'remember-session-token',
				session: {
					createdAt: now,
					expiresAt: new Date(now.getTime() + REMEMBER_ME_DURATION)
				}
			})
		);

		const response = await respondWithSession(
			{
				user: {
					id: 'user-1',
					email: 'user@example.com'
				}
			},
			{
				request: createRequest(),
				url: new URL('https://sciledger.online/login'),
				rememberMe: true
			},
			createSession
		);

		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				rememberMe: true
			})
		);
		expect(getSessionCookie(response)).toContain('session=remember-session-token');
		expect(mocks.updateOne).toHaveBeenCalledWith(
			{ $or: [{ id: 'user-1' }, { _id: 'user-1' }] },
			{ $min: { firstLoginAt: now }, $max: { lastLoginAt: now } }
		);
		expect(getSessionCookie(response)).not.toContain('jwt=');
		expect(getSessionCookie(response)).toContain(
			`Expires=${new Date(now.getTime() + REMEMBER_ME_DURATION).toUTCString()}`
		);
	});

	it('preserves an earlier login after its session has expired', async () => {
		const firstLoginAt = new Date('2026-01-01T12:00:00Z');
		const now = new Date('2026-10-02T12:00:00Z');
		await respondWithSession(
			{ user: { id: 'user-1', firstLoginAt } },
			{ request: createRequest(), url: new URL('https://sciledger.online/login') },
			vi.fn().mockResolvedValue({
				sessionToken: 'new-session',
				session: { createdAt: now, expiresAt: new Date('2027-01-01') }
			})
		);
		expect(mocks.updateOne).toHaveBeenCalledWith(
			{ $or: [{ id: 'user-1' }, { _id: 'user-1' }] },
			{ $min: { firstLoginAt }, $max: { lastLoginAt: now } }
		);
	});

	it('recovers and persists the earliest retained session for a legacy account', async () => {
		const firstLoginAt = new Date('2026-09-01T12:00:00Z');
		const now = new Date('2026-10-02T12:00:00Z');
		mocks.aggregate.mockResolvedValue([{ _id: 'user-1', firstLoginAt, lastLoginAt: now }]);
		await respondWithSession(
			{ user: { id: 'user-1' } },
			{ request: createRequest(), url: new URL('https://sciledger.online/orcid/callback') },
			vi.fn().mockResolvedValue({
				sessionToken: 'orcid-session',
				session: { createdAt: now, expiresAt: new Date('2027-01-01') }
			})
		);
		expect(mocks.updateOne).toHaveBeenCalledWith(
			{ $or: [{ id: 'user-1' }, { _id: 'user-1' }] },
			{ $min: { firstLoginAt }, $max: { lastLoginAt: now } }
		);
	});

	it('does not record a login when session creation fails', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const response = await respondWithSession(
				{ user: { id: 'user-1' } },
				{ request: createRequest(), url: new URL('https://sciledger.online/login') },
				vi.fn().mockRejectedValue(new Error('Session failed'))
			);
			expect(mocks.updateOne).not.toHaveBeenCalled();
			expect(mocks.aggregate).not.toHaveBeenCalled();
			expect(getSessionCookie(response)).toBe('');
		} finally {
			log.mockRestore();
		}
	});

	it('keeps the login cookie if recording the timestamp fails', async () => {
		mocks.updateOne.mockRejectedValue(new Error('Write failed'));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const response = await respondWithSession(
				{ user: { _id: 'legacy-user' } },
				{ request: createRequest(), url: new URL('https://sciledger.online/login') },
				vi.fn().mockResolvedValue({
					sessionToken: 'valid-session',
					session: { createdAt: new Date(), expiresAt: new Date('2027-01-01') }
				})
			);
			expect(mocks.updateOne).toHaveBeenCalledWith(
				{ $or: [{ id: 'legacy-user' }, { _id: 'legacy-user' }] },
				{ $min: { firstLoginAt: expect.any(Date) }, $max: { lastLoginAt: expect.any(Date) } }
			);
			expect(getSessionCookie(response)).toContain('session=valid-session');
		} finally {
			log.mockRestore();
		}
	});
});
