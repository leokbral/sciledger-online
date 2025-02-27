import * as api from '$lib/api';
//import { redirect } from '@sveltejs/kit';
import { respond } from '../_respond';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	/*    
	   if (locals.user) {
		   redirect(302, '/')
	   }
	*/
	const email = await request.json();
	// TODO individual properties
	const body = await api.post('forgetPassword', email);
	return respond(body);
};