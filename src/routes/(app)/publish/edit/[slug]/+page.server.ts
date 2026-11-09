import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import { collectReusableAffiliations } from '$lib/utils/paperAuthorAffiliations';
import { loadSubmissionHub } from '$lib/server/submissionHub';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// Função de sanitização
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

/**
 * Affiliations this user already used on their own papers, offered in the editor so the same
 * institution never has to be retyped. Only the requesting user's own author snapshots are
 * read: this is not a global institution directory, and no other author's data is exposed.
 */
async function loadKnownAffiliations(userId: string) {
	if (!userId) return [];

	const papers = await Papers.find({ 'authorAffiliations.userId': userId }, { authorAffiliations: 1 })
		.sort({ updatedAt: -1 })
		.limit(50)
		.lean()
		.exec();

	const affiliations = papers.flatMap((paper: any) =>
		(paper?.authorAffiliations ?? [])
			.filter((author: any) => String(author?.userId ?? '') === userId)
			.flatMap((author: any) => author?.affiliations ?? [])
	);

	return collectReusableAffiliations(affiliations).map((entry) => entry.affiliation);
}

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const paperDoc = await Papers.findOne({ id: params.slug }, {})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Paper not found');
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	const knownAffiliations = await loadKnownAffiliations(String(locals.user.id ?? ''));
	const submissionHub = await loadSubmissionHub(
		typeof paperDoc.hubId === 'object' && paperDoc.hubId
			? String(paperDoc.hubId._id || paperDoc.hubId.id)
			: paperDoc.hubId
	);

	return {
		paper: sanitize(paperDoc),
		users: sanitize(usersDoc),
		knownAffiliations,
		submissionHub
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
