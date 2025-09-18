import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// ✅ Função de sanitização
function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}
	
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}
	
	if (obj && typeof obj === 'object') {
		// Handle MongoDB ObjectId
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}
		
		// Handle Date objects
		if (obj instanceof Date) {
			return obj.toISOString();
		}
		
		// Handle regular objects
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
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