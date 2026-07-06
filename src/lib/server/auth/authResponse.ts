import { respond } from '../../../routes/(auth)/_respond';
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
	const response = respond(body);

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
	} catch (error) {
		console.error('Failed to create persistent user session:', error);
	}

	return response;
}
