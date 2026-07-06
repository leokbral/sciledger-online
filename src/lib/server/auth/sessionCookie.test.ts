import { describe, expect, it } from 'vitest';
import {
	isSecureRequest,
	serializeExpiredSessionCookie,
	serializeSessionCookie
} from './sessionCookie';

describe('session cookie helpers', () => {
	it('serializes the persistent session cookie with secure auth defaults', () => {
		const cookie = serializeSessionCookie('token-value', {
			secure: true,
			expires: new Date('2026-07-03T20:00:00.000Z')
		});

		expect(cookie).toContain('session=token-value');
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('Secure');
		expect(cookie).toContain('SameSite=Lax');
		expect(cookie).toContain('Path=/');
		expect(cookie).toContain('Expires=');
	});

	it('detects secure requests from the URL or forwarded proto header', () => {
		expect(isSecureRequest(new URL('https://sciledger.online/login'))).toBe(true);
		expect(
			isSecureRequest(
				new URL('http://localhost/login'),
				new Request('http://localhost/login', {
					headers: {
						'x-forwarded-proto': 'https'
					}
				})
			)
		).toBe(true);
		expect(isSecureRequest(new URL('http://localhost/login'))).toBe(false);
	});

	it('expires the persistent session cookie for logout', () => {
		const cookie = serializeExpiredSessionCookie({ secure: false });

		expect(cookie).toContain('session=deleted');
		expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
	});
});
