import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// 🔧 Função de sanitização
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

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const id = params.slug;

	// Buscar o Paper baseado no ID
	const paperDoc = await Papers.findOne({ id }, {})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate({
			path: 'peer_review.reviews',
			populate: {
				path: 'reviewerId',
				model: 'User'
			}
		})
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Paper not found');
	}

	// Normalizar peer_review
	const peer_review = paperDoc.peer_review
		? {
				reviewType: paperDoc.peer_review.reviewType,
				assignedReviewers: paperDoc.peer_review.assignedReviewers ?? [],
				responses: paperDoc.peer_review.responses ?? [],
				reviews: paperDoc.peer_review.reviews ?? [],
				averageScore: paperDoc.peer_review.averageScore ?? 0,
				reviewCount: paperDoc.peer_review.reviewCount ?? 0,
				reviewStatus: paperDoc.peer_review.reviewStatus ?? 'not_started'
		  }
		: {
				reviewType: "open",
				assignedReviewers: [],
				responses: [],
				reviews: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: "not_started"
		  };

	const paper = {
		...paperDoc,
		peer_review
	};

	// Buscar o MessageFeed
	const messageFeedDoc = await MessageFeeds.findOne(
		{ id: "597c84b3-d2a8-4fcc-950e-7ffff8739650" }, {}
	)
		.populate('messages.sender')
		.lean()
		.exec();

	const usersDoc = await Users.find({}, {}).lean().exec();

	return {
		id,
		user: sanitize(locals.user),
		paper: sanitize(paper),
		users: sanitize(usersDoc),
		messageFeed: sanitize(messageFeedDoc)
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		return { success: true };
	}
};
