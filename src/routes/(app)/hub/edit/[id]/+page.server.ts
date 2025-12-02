import { start_mongo } from '$lib/db/mongooseConnection';
import { redirect, error } from '@sveltejs/kit';
import Hubs from '$lib/db/models/Hub';

export async function load({ params, locals }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const hub = await Hubs.findById(params.id)
		.populate('createdBy', 'name email')
		.lean();

	if (!hub) {
		throw error(404, 'Hub not found');
	}

	// Check if user is the creator of the hub
	if (hub.createdBy._id.toString() !== locals.user.id) {
		throw error(403, 'You do not have permission to edit this hub');
	}

	return {
		hub,
		user: locals.user
	};
}
