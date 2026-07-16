import { json, type RequestHandler } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { start_mongo } from '$lib/db/mongooseConnection';
import { hashSessionToken, revokeSessionById } from '$lib/server/auth/SessionService';
import {
	SESSION_COOKIE_NAME,
	isSecureRequest,
	serializeExpiredSessionCookie
} from '$lib/server/auth/sessionCookie';

// Revokes exactly one session, scoped to the authenticated user -- revokeSessionById
// only matches a document where both _id and userId match, so a user can never
// revoke another account's session by guessing/enumerating an id.
export const DELETE: RequestHandler = async ({ params, request, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	const sessionId = params.id;
	if (!sessionId) {
		return json({ error: 'Session id is required.' }, { status: 400 });
	}

	await start_mongo();

	const revoked = await revokeSessionById(sessionId, locals.user.id, 'user_revoked');
	if (!revoked) {
		return json({ error: 'Session not found.' }, { status: 404 });
	}

	const cookies = cookie.parse(request.headers.get('cookie') || '');
	const currentSessionToken = cookies[SESSION_COOKIE_NAME];
	const isCurrentSession =
		!!currentSessionToken && revoked.sessionTokenHash === hashSessionToken(currentSessionToken);

	const headers = new Headers();
	if (isCurrentSession) {
		// The session just revoked is the one the browser is using right now --
		// clear its cookie too so the user is logged out immediately, not just
		// on their next request.
		headers.append(
			'set-cookie',
			serializeExpiredSessionCookie({ secure: isSecureRequest(url, request) })
		);
	}

	return json({ success: true, currentSession: isCurrentSession }, { headers });
};
