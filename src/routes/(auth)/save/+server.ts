import { error } from '@sveltejs/kit';
import * as api from '$lib/api';
import { respond } from '../_respond';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		error(401);
	}

	const user = await request.json();
	const { token } = locals.user;
	const body = await api.put(
		'user',
		{
			user // TODO individual properties
		},
		token
	);

	return respond(body);
};