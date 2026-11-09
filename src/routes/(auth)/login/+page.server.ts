import type { /* Action, Actions, */ PageServerLoad } from './$types';
import { /* invalid, */ redirect } from '@sveltejs/kit';
import { hubLoginReturnTo } from '$lib/helpers/authReturnTo';
import { AUTH_RETURN_TO_COOKIE } from '$lib/server/auth/returnTo';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// A normal login must never inherit a previous Hub submission.
	cookies.delete(AUTH_RETURN_TO_COOKIE, { path: '/' });
	const returnTo = locals.user ? '/' : hubLoginReturnTo(url.searchParams);
	// redirect user if logged in
	if (locals.user) {
		redirect(302, returnTo);
	}
	return { returnTo };
};
