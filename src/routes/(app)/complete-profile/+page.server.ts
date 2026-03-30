import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	try {
		await start_mongo();

		// Pega o userId da sessão/locals
		// Isso depende de como você implementou a autenticação
		// Se usar JWT no cookie:
		const sessionCookie = cookies.get('session');
		if (!sessionCookie) {
			throw redirect(302, '/login');
		}

		// Decodifica o JWT (adapte conforme sua implementação)
		let userId: string | null = null;
		try {
			const userPayload = JSON.parse(
				Buffer.from(sessionCookie.split('.')[1], 'base64').toString()
			);
			userId = userPayload.id || userPayload.sub;
		} catch {
			throw redirect(302, '/login');
		}

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
