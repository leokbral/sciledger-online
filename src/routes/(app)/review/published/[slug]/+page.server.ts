import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';

// Sanatize function
function sanitize(obj: unknown): unknown {
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	} else if (obj && typeof obj === 'object') {
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			const value = (obj as Record<string, unknown>)[key];

			if (value?.constructor?.name === 'ObjectId' && typeof value.toString === 'function') {
				clean[key] = value.toString();
			} else if (value instanceof Date) {
				clean[key] = value.toISOString();
			} else {
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}
	return obj;
}

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	// Search for papers reviewed by the current user and published
	const paperDoc = await Papers.findOne({
		id: params.slug,
		status: 'published',
		// Check if the user participated in the review
		'peer_review.responses': {
			$elemMatch: {
				reviewerId: locals.user.id,
				status: 'completed'
			}
		}
	})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate({
			path: 'hubId',
			match: { isLinkedToHub: true }
		})
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Published paper not found or you did not review this paper');
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	// ✅ Return sanitized version
	return {
		paper: sanitize(paperDoc),
		users: sanitize(usersDoc)
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
