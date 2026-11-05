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
type Sanitized<T> = T extends Date
	? string
	: T extends { toHexString(): string }
		? string
		: T extends readonly (infer U)[]
			? Sanitized<U>[]
			: T extends object
				? { [K in keyof T]: Sanitized<T[K]> }
				: T;

function sanitize<T>(obj: T): Sanitized<T> {
	if (obj === null || obj === undefined) {
		return obj as Sanitized<T>;
	}
	
	if (Array.isArray(obj)) {
		return obj.map((item) => sanitize(item)) as Sanitized<T>;
	}
	
	if (obj && typeof obj === 'object') {
		// Handle MongoDB ObjectId
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString() as Sanitized<T>;
		}
		
		// Handle Date objects
		if (obj instanceof Date) {
			return obj.toISOString() as Sanitized<T>;
		}
		
		// Handle regular objects
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
				clean[key] = sanitize(value);
			}
		}
		return clean as Sanitized<T>;
	}
	
	return obj as Sanitized<T>;
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