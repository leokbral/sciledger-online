import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const id = params.slug;

	const paperDoc = await Papers.findOne({ id }, {})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.lean()
		.exec();

	if (!paperDoc) throw error(404, 'Paper not found');

	// 🔧 Correção: normalize peer_review removendo _id
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
		peer_review: peerReview // seguro para o SvelteKit
	};

	const messageFeed = await MessageFeeds.findOne({ id: "597c84b3-d2a8-4fcc-950e-7ffff8739650" }, {})
		.populate('messages.sender')
		.lean()
		.exec();

	const fetchUsers = async () => {
		const users = await Users.find({}, {}).lean().exec();
		return users;
	};

	return {
		id,
		user: locals.user,
		paper,
		users: await fetchUsers(),
		messageFeed
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
