import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

function getIdAliases(value: unknown): string[] {
	if (!value) return [];

	if (typeof value === 'string') {
		return [String(value)];
	}

	if (typeof value !== 'object') {
		return [];
	}

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};

	const aliases = [candidate.id, candidate._id]
		.filter(Boolean)
		.map((alias) => String(alias));

	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases));
}

function matchesCurrentUser(value: unknown, currentUser: Record<string, unknown>): boolean {
	const userAliases = new Set(getIdAliases(currentUser));
	return getIdAliases(value).some((alias) => userAliases.has(alias));
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
	if (!locals.user) throw redirect(302, `/login`);

	const id = params.slug;

	// Buscar o Paper baseado no ID
	const paperDoc = await Papers.findOne({ id }, {})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate("hubId")
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

	const isReviewerAccepted = (paperDoc.peer_review?.responses ?? []).some((response: any) => {
		return (
			(response?.status === 'accepted' || response?.status === 'completed') &&
			matchesCurrentUser(response?.reviewerId, locals.user as Record<string, unknown>)
		);
	});

	const hubData = typeof paperDoc.hubId === 'object' ? paperDoc.hubId : null;
	const isHubReviewer =
		Array.isArray(hubData?.reviewers) &&
		hubData.reviewers.some((reviewer: any) =>
			matchesCurrentUser(reviewer, locals.user as Record<string, unknown>)
		);
	const isHubOwner = matchesCurrentUser(
		hubData?.createdBy,
		locals.user as Record<string, unknown>
	);

	if (isReviewerAccepted || isHubReviewer || isHubOwner) {
		throw redirect(302, `/review/correction/${id}`);
	}

	// Verificar se é autor do paper (main author ou co-author)
	const isMainAuthor = paperDoc.mainAuthor?._id?.toString() === locals.user.id || 
		paperDoc.mainAuthor?.id === locals.user.id;
	const isCoAuthor = paperDoc.coAuthors && paperDoc.coAuthors.some((author: any) => 
		author._id?.toString() === locals.user.id || author.id === locals.user.id
	);
	const isAuthor = isMainAuthor || isCoAuthor;

	// Only authors can view/edit correction papers
	if (!isAuthor) {
		throw error(403, 'You do not have permission to view this paper');
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
		peer_review,
		correctionProgress: paperDoc.correctionProgress instanceof Map
			? Object.fromEntries(paperDoc.correctionProgress) 
			: paperDoc.correctionProgress || {}
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
