import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

function getUserIdFromAuth(localsUser: any, jwtCookie?: string): string | null {
	if (localsUser?.id) return String(localsUser.id);

	if (!jwtCookie) return null;

	try {
		const decoded = JSON.parse(Buffer.from(jwtCookie, 'base64').toString());
		return decoded?.user?.id || decoded?.user?._id || decoded?.id || decoded?.sub || null;
	} catch {
		return null;
	}
}
export const load: PageServerLoad = async ({ locals, cookies }) => {
	try {
		await start_mongo();

		const jwtCookie = cookies.get('jwt');
		const userId = getUserIdFromAuth(locals.user, jwtCookie);

		if (!userId) {
			throw redirect(302, '/login');
		}

		const user = await Users.findById(userId);

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
