import { describe, expect, it, vi } from 'vitest';
import { REMEMBER_ME_DURATION, SESSION_DURATION } from './sessionConstants';
import { respondWithSession } from './authResponse';

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
	it('creates a normal login session with a 30 day cookie', async () => {
		const now = new Date('2026-07-03T12:00:00.000Z');
		const createSession = vi.fn(
			async (input: { userId: string; rememberMe: boolean; ip: string; userAgent: string }) => ({
				sessionToken: 'normal-session-token',
				session: {
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
		expect(getSessionCookie(response)).toContain(
			`Expires=${new Date(now.getTime() + REMEMBER_ME_DURATION).toUTCString()}`
		);
	});
});
