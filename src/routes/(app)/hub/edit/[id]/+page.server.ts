import { start_mongo } from '$lib/db/mongooseConnection';
import { redirect, error } from '@sveltejs/kit';
import Hubs from '$lib/db/models/Hub';
import { authorize } from '$lib/server/authorization/authorizationService';

export async function load({ params, locals }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const hub = await Hubs.findById(params.id).lean();

	if (!hub) {
		throw error(404, 'Hub not found');
	}

	const authorization = await authorize(locals.user, 'hub.manageRoles', { hub });
	if (!authorization.allowed) {
		throw error(403, 'You do not have permission to edit this hub');
	}

	return {
		hub,
		user: locals.user
	};
}
