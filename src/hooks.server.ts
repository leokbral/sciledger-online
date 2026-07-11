import type { Handle } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { env } from '$env/dynamic/private';
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

// The app is single-origin; the wildcard this used to be here can never be
// combined with Allow-Credentials in real browsers anyway. Reuse the same
// configured-site-origin convention already used everywhere else in this
// codebase (email links, Stripe redirect URLs) rather than inventing a new
// multi-origin allowlist mechanism.
function getAllowedOrigin(requestUrl: URL): string {
	const configuredOrigin = env.SITE_URL || env.PUBLIC_SITE_URL;
	if (configuredOrigin) {
		return configuredOrigin.replace(/\/+$/, '');
	}

	return requestUrl.origin;
}

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
			'-password -refreshToken -resetPasswordTokenHash -resetPasswordExpiresAt -pendingEmailTokenHash -pendingEmailExpiresAt -orcidAccessToken -orcidRefreshToken'
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
		} catch (error) {
			console.error('Failed to authenticate with persistent session:', error);
			clearSessionCookie = true;
		}
	}

	const response = await resolve(event);

	response.headers.set('Access-Control-Allow-Origin', getAllowedOrigin(event.url));
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
