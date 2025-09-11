import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';

// ✅ Função de sanitização
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

	const paperDoc = await Papers.findOne({ id: params.slug })
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
		throw error(404, 'Paper not found');
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	// ✅ Retornar versão sanitizada
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
