import type { PageServerLoad } from './$types';
import * as cookie from 'cookie';
import { start_mongo } from '$lib/db/mongooseConnection';
import { hashSessionToken, listActiveSessions } from '$lib/server/auth/SessionService';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/sessionCookie';
import { toSessionSummary } from '$lib/server/auth/sessionSummary';

export const load: PageServerLoad = async ({ request, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		// Unreachable in practice: the parent +layout.server.ts already
		// redirects unauthenticated requests before this load runs.
		return { sessions: [] };
	}

	await start_mongo();

	const cookies = cookie.parse(request.headers.get('cookie') || '');
	const currentSessionToken = cookies[SESSION_COOKIE_NAME];
	const currentSessionTokenHash = currentSessionToken ? hashSessionToken(currentSessionToken) : null;

	const sessions = await listActiveSessions(userId);

	return {
		sessions: sessions.map((session) => toSessionSummary(session, currentSessionTokenHash))
	};
};
