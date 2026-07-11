import { json, type RequestHandler } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { start_mongo } from '$lib/db/mongooseConnection';
import { findSession, revokeAllUserSessionsExcept } from '$lib/server/auth/SessionService';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/sessionCookie';

// Revokes every OTHER active session for the authenticated user. The current
// session (identified by the request's own cookie) is always excluded --
// this endpoint never logs the caller out.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	await start_mongo();

	const cookies = cookie.parse(request.headers.get('cookie') || '');
	const currentSessionToken = cookies[SESSION_COOKIE_NAME];
	const currentSession = currentSessionToken ? await findSession(currentSessionToken) : null;

	if (!currentSession) {
		return json({ error: 'Active session not found.' }, { status: 401 });
	}

	const result = await revokeAllUserSessionsExcept(locals.user.id, String(currentSession._id));

	return json({ success: true, revokedCount: result.modifiedCount });
};
