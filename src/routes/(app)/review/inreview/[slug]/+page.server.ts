import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

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
	const userId = locals.user.id;

	// Busca o paper com status "in review"
	const paperDoc = await Papers.findOne({
		id,
		status: "in review"
	}, {})
		.populate('authors')
		.populate('mainAuthor')
		.populate('coAuthors')
		.populate('hubId')
		.lean()
		.exec();

	if (!paperDoc) throw error(404, 'Paper not found');

	// Verificar se o usuário tem permissão para REVISAR este paper
	// Precisa ter aceitado revisar (estar nos responses com status 'accepted')
	const isReviewerAccepted = paperDoc.peer_review?.responses?.some(
		(r: any) => r.reviewerId === userId && r.status === 'accepted'
	);
	
	// Dono do hub pode ver (mas não necessariamente revisar)
	const hubCreatorId = typeof paperDoc.hubId === 'object'
		? (paperDoc.hubId?.createdBy?._id || paperDoc.hubId?.createdBy?.id || paperDoc.hubId?.createdBy)
		: null;
	const isHubOwner = hubCreatorId?.toString() === userId;

	// Para REVISAR o paper: precisa ter aceitado OU ser dono do hub
	if (!isReviewerAccepted && !isHubOwner) {
		throw error(403, 'You need to accept this review request before you can review this paper');
	}

	// Mesmo se você quiser manter essa estrutura...
	const peerReview = paperDoc.peer_review
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
				reviewType: 'open',
				assignedReviewers: [],
				responses: [],
				reviews: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: 'not_started'
			};

	const paper = {
		...paperDoc,
		peer_review: peerReview
	};

	const messageFeed = await MessageFeeds.findOne({ id: '597c84b3-d2a8-4fcc-950e-7ffff8739650' }, {})
		.populate('messages.sender')
		.lean()
		.exec();

	const users = await Users.find({}, {}).lean().exec();

	// ✅ Sanitize os dados antes de retornar
	return {
		id,
		user: sanitize(locals.user),
		paper: sanitize(paper),
		users: sanitize(users),
		messageFeed: sanitize(messageFeed)
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
