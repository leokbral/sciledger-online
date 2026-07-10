import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		await start_mongo();

		const userId = locals.user?.id ? String(locals.user.id) : null;

		if (!userId) {
			throw redirect(302, '/login');
		}

		const user = await Users.findOne({ $or: [{ id: userId }, { _id: userId }] });

		if (!user) {
			throw redirect(302, '/login');
		}

		return {
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				country: user.country || '',
				dob: user.dob || '',
				orcid: user.orcid || null
			}
		};
	} catch (error) {
		console.error('Error loading complete-profile:', error);
		if (error instanceof Response) {
			throw error;
		}
		throw redirect(302, '/login');
	}
};
