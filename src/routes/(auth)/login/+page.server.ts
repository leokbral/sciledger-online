import type { /* Action, Actions, */ PageServerLoad } from './$types';
import { /* invalid, */ redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// redirect user if logged in
console.log("chamou login", locals)
	if (locals.user) {
		redirect(302, '/');
	}
	return {};
};
