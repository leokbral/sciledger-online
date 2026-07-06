import * as cookie from 'cookie';

export const SESSION_COOKIE_NAME = 'session';

type SessionCookieOptions = {
	secure?: boolean;
	expires?: Date;
};

export function isSecureRequest(url: URL, request?: Request) {
	const forwardedProto = request?.headers.get('x-forwarded-proto') || '';
	return url.protocol === 'https:' || forwardedProto.split(',')[0]?.trim() === 'https';
}

export function serializeSessionCookie(sessionToken: string, options: SessionCookieOptions = {}) {
	return cookie.serialize(SESSION_COOKIE_NAME, sessionToken, {
		path: '/',
		httpOnly: true,
		secure: Boolean(options.secure),
		sameSite: 'lax',
		expires: options.expires
	});
}

export function serializeExpiredSessionCookie(options: Pick<SessionCookieOptions, 'secure'> = {}) {
	return serializeSessionCookie('deleted', {
		secure: options.secure,
		expires: new Date(0)
	});
}

export function serializeExpiredLegacyJwtCookie() {
	return cookie.serialize('jwt', 'deleted', {
		path: '/',
		httpOnly: true,
		expires: new Date(0)
	});
}
