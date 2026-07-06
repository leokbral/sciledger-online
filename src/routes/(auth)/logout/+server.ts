import { json } from '@sveltejs/kit';
import * as cookie from 'cookie';
import type { RequestHandler } from './$types';
import { revokeSession } from '$lib/server/auth/SessionService';
import {
	SESSION_COOKIE_NAME,
	isSecureRequest,
	serializeExpiredLegacyJwtCookie,
	serializeExpiredSessionCookie
} from '$lib/server/auth/sessionCookie';

export const POST: RequestHandler = async ({ request, url }) => {
	const cookies = cookie.parse(request.headers.get('cookie') || '');
	const sessionToken = cookies[SESSION_COOKIE_NAME];

	if (sessionToken) {
		try {
			await revokeSession(sessionToken, 'logout');
		} catch (error) {
			console.error('Failed to revoke persistent session during logout:', error);
		}
	}

	const headers = new Headers();
	headers.append('set-cookie', serializeExpiredLegacyJwtCookie());
	headers.append(
		'set-cookie',
		serializeExpiredSessionCookie({
			secure: isSecureRequest(url, request)
		})
	);

	return json(
		{
			ok: true
		},
		{
			headers
		}
	);
};
