import * as cookie from 'cookie';
import { hubLoginReturnTo, safeReturnTo } from '$lib/helpers/authReturnTo';

export const AUTH_RETURN_TO_COOKIE = 'auth_return_to';

export function getAuthReturnTo(request: Request): string {
	const cookies = cookie.parse(request.headers.get('cookie') || '');
	return hubLoginReturnTo(
		new URLSearchParams({
			from: 'hub-submission',
			returnTo: cookies[AUTH_RETURN_TO_COOKIE] || ''
		})
	);
}

export function clearAuthReturnTo(response: Response, secure: boolean): void {
	response.headers.append(
		'set-cookie',
		cookie.serialize(AUTH_RETURN_TO_COOKIE, '', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			maxAge: 0
		})
	);
}

export function profileReturnTo(returnTo: string): string {
	const destination = safeReturnTo(returnTo);
	return destination === '/'
		? '/complete-profile'
		: `/complete-profile?${new URLSearchParams({ returnTo: destination })}`;
}
