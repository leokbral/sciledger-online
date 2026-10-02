import { error, json } from '@sveltejs/kit';
import Users from '$lib/db/models/User';
import { getUserLoginHistory } from './loginHistory';
import { createSession } from './SessionService';
import { isSecureRequest, serializeSessionCookie } from './sessionCookie';

type AuthResponseOptions = {
	request: Request;
	url: URL;
	rememberMe?: boolean;
};

type CreateSessionForAuth = (input: {
	userId: string;
	rememberMe: boolean;
	ip: string;
	userAgent: string;
}) => Promise<{
	sessionToken: string;
	session: {
		createdAt: Date;
		expiresAt: Date;
	};
}>;

function getRequestIp(request: Request) {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || '';

	return request.headers.get('x-real-ip') || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function respondWithSession(
	body: any,
	options: AuthResponseOptions,
	createSessionForAuth: CreateSessionForAuth = createSession
) {
	if (body?.errors) {
		error(body.status || 500, body);
	}

	const response = json(body);

	if (!body?.user) {
		return response;
	}

	try {
		const userId = body.user.id || body.user._id?.toString();
		if (!userId) {
			return response;
		}

		const { session, sessionToken } = await createSessionForAuth({
			userId,
			rememberMe: Boolean(options.rememberMe),
			ip: getRequestIp(options.request),
			userAgent: options.request.headers.get('user-agent') || ''
		});

		response.headers.append(
			'set-cookie',
			serializeSessionCookie(sessionToken, {
				secure: isSecureRequest(options.url, options.request),
				expires: session.expiresAt
			})
		);

		try {
			const history = await getUserLoginHistory([body.user]);
			await Users.updateOne(
				{ $or: [{ id: userId }, { _id: userId }] },
				{
					$min: { firstLoginAt: history.get(String(userId))?.firstLoginAt ?? session.createdAt },
					$max: { lastLoginAt: session.createdAt }
				}
			);
		} catch (error) {
			// Login remains available if recording its timestamp fails.
			console.error('Failed to record login dates:', error);
		}
	} catch (error) {
		console.error('Failed to create persistent user session:', error);
	}

	return response;
}
