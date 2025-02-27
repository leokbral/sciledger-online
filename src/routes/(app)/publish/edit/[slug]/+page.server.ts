import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
//import * as api from '$lib/api.js';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const paper = await Papers.findOne({ id: params.slug }, {}).populate("authors").lean().exec();	

	const fetchUsers = async () => {
		const users = await Users.find({}, { _id: 0 }).lean().exec();
		return users;
	};

	return { paper, users: await fetchUsers() };

}

export const actions = {
	default: async ({ locals /* , params, request */ }) => {
		if (!locals.user) error(401);

	}
};