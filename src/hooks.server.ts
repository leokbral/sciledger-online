import type { Handle } from '@sveltejs/kit';
import * as cookie from 'cookie';
import Users from '$lib/db/models/User';
import {
	renewIfNecessary,
	shouldRenew,
	shouldTouchSession,
	touchSession,
	validateSession
} from '$lib/server/auth/SessionService';
import {
	SESSION_COOKIE_NAME,
	isSecureRequest,
	serializeExpiredSessionCookie,
	serializeSessionCookie
} from '$lib/server/auth/sessionCookie';

// Lazy load MongoDB to avoid connection during build
let mongoStarted = false;
const initMongo = async () => {
	if (mongoStarted) return;
	mongoStarted = true;
	try {
		const { start_mongo } = await import('$lib/db/mongo');
		await start_mongo();
		const { startReviewInvitationExpirationJob } = await import(
			'$lib/server/jobs/reviewInvitationExpirationJob'
		);
		startReviewInvitationExpirationJob();
	} catch (e) {
		console.error('Failed to start MongoDB:', e);
	}
};

// Start MongoDB when first request comes in
let mongoInitPromise: Promise<void> | null = null;

function getSessionUser(user: any) {
	return {
		id: user.id || user._id?.toString(),
		email: user.email,
		username: user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		roles: user.roles,
		profilePictureUrl: user.profilePictureUrl,
		bio: user.bio,
		position: user.position,
		institution: user.institution,
		orcid: user.orcid
	};
}

async function authenticateWithSession(sessionToken: string, event: Parameters<Handle>[0]['event']) {
	const session = await validateSession(sessionToken);
	if (!session) {
		return {
			authenticated: false,
			clearSessionCookie: true
		};
	}

	const shouldSetRenewedCookie = shouldRenew(session);
	const activeSession = await renewIfNecessary(sessionToken);
	if (!activeSession) {
		return {
			authenticated: false,
			clearSessionCookie: true
		};
	}

	const user = await Users.findOne({ $or: [{ id: activeSession.userId }, { _id: activeSession.userId }] })
		.select(
			'-password -refreshToken -resetPasswordToken -resetPasswordExpiry -orcidAccessToken -orcidRefreshToken'
		)
		.lean();

	if (!user) {
		return {
			authenticated: false,
			clearSessionCookie: true
		};
	}

	event.locals.user = getSessionUser(user);

	if (!shouldSetRenewedCookie && shouldTouchSession(activeSession)) {
		try {
			await touchSession(sessionToken);
		} catch (error) {
			console.error('Failed to update session activity:', error);
		}
	}

	return {
		authenticated: true,
		renewedExpiresAt: shouldSetRenewedCookie ? activeSession.expiresAt : null,
		clearSessionCookie: false
	};
}

function authenticateWithLegacyJwt(
	jwtCookie: string | undefined,
	event: Parameters<Handle>[0]['event']
) {
	if (!jwtCookie) return;

	const jwt = Buffer.from(jwtCookie, 'base64').toString('utf-8');
	const _jwt = JSON.parse(jwt);
	event.locals.user = _jwt.user;
	event.locals.token = _jwt.token;
	event.locals.refreshToken = _jwt.refreshToken;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize MongoDB on first request
	if (!mongoInitPromise) {
		mongoInitPromise = initMongo();
	}
	await mongoInitPromise;

	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	const sessionToken = cookies[SESSION_COOKIE_NAME];
	let clearSessionCookie = false;
	let renewedSessionExpiresAt: Date | null = null;

	if (sessionToken) {
		try {
			const sessionAuth = await authenticateWithSession(sessionToken, event);
			clearSessionCookie = sessionAuth.clearSessionCookie;
			renewedSessionExpiresAt = sessionAuth.renewedExpiresAt ?? null;

			if (!sessionAuth.authenticated) {
				authenticateWithLegacyJwt(cookies.jwt, event);
			}
		} catch (error) {
			console.error('Failed to authenticate with persistent session:', error);
			clearSessionCookie = true;
			authenticateWithLegacyJwt(cookies.jwt, event);
		}
	} else {
		authenticateWithLegacyJwt(cookies.jwt, event);
	}

	const response = await resolve(event);

	response.headers.set('Access-Control-Allow-Origin', '*'); // Allows all origins, you can restrict to a specific domain
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Requested-With'
	);
	response.headers.set('Access-Control-Allow-Credentials', 'true');

	if (clearSessionCookie) {
		response.headers.append(
			'set-cookie',
			serializeExpiredSessionCookie({
				secure: isSecureRequest(event.url, event.request)
			})
		);
	} else if (sessionToken && renewedSessionExpiresAt) {
		response.headers.append(
			'set-cookie',
			serializeSessionCookie(sessionToken, {
				secure: isSecureRequest(event.url, event.request),
				expires: renewedSessionExpiresAt
			})
		);
	}

	return response;
};
