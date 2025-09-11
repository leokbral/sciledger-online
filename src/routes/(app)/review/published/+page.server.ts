import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { redirect } from '@sveltejs/kit';
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

export async function load({ locals }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	// Busca todos os papers publicados que foram revisados pelo usuário atual
	const reviewedPublishedPapers = await Papers.find({
		status: 'published',
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
		.sort({ updatedAt: -1 }) // Mais recentes primeiro
		.lean()
		.exec();

	const usersDoc = await Users.find({}, {}).lean().exec();

	// ✅ Retornar versão sanitizada
	return {
		papers: sanitize(reviewedPublishedPapers),
		users: sanitize(usersDoc)
	};
}