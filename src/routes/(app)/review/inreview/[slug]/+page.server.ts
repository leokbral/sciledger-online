import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

function sanitize(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	} else if (obj && typeof obj === 'object') {
		const clean: Record<string, any> = {};
		for (const key in obj) {
			const value = obj[key];

			// Converte ObjectId para string
			if (value?.constructor?.name === 'ObjectId' && typeof value.toString === 'function') {
				clean[key] = value.toString();
			}
			// Converte Date para ISO
			else if (value instanceof Date) {
				clean[key] = value.toISOString();
			}
			// Recurse
			else {
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

	// Busca o paper apenas se o revisor aceitou mas ainda não completou sua revisão
	const paperDoc = await Papers.findOne({
		id,
		status: "in review",
		"peer_review.assignedReviewers": locals.user.id,
		$and: [
			{
				"peer_review.responses": {
					$elemMatch: {
						reviewerId: locals.user.id,
						status: "accepted"
					}
				}
			},
			{
				"peer_review.responses": {
					$not: {
						$elemMatch: {
							reviewerId: locals.user.id,
							status: "completed"
						}
					}
				}
			}
		]
	}, {})
		.populate('authors')
		.populate('mainAuthor')
		.populate('coAuthors')
		.lean()
		.exec();

	if (!paperDoc) throw error(404, 'Paper not found or review already completed');

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
