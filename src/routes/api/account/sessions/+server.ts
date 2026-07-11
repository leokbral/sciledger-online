import { json, type RequestHandler } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { start_mongo } from '$lib/db/mongooseConnection';
import { hashSessionToken, listActiveSessions } from '$lib/server/auth/SessionService';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/sessionCookie';
import { toSessionSummary } from '$lib/server/auth/sessionSummary';

export const GET: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	await start_mongo();

	const cookies = cookie.parse(request.headers.get('cookie') || '');
	const currentSessionToken = cookies[SESSION_COOKIE_NAME];
	const currentSessionTokenHash = currentSessionToken ? hashSessionToken(currentSessionToken) : null;

	const sessions = await listActiveSessions(locals.user.id);

	return json({
		sessions: sessions.map((session) => toSessionSummary(session, currentSessionTokenHash))
	});
};
