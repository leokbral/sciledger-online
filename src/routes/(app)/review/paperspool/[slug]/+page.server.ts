import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const userId = locals.user.id;

	const paperRaw = await Papers.findOne({ id: params.slug })
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate("reviewers")
		.populate("hubId")
		.lean()
		.exec();

	if (!paperRaw) throw error(404, "Paper não encontrado");

	// Verificar permissões: revisor do hub ou dono do hub
	const isHubReviewer = typeof paperRaw.hubId === 'object' && 
		Array.isArray(paperRaw.hubId?.reviewers) && 
		paperRaw.hubId?.reviewers?.includes(userId);
	
	const hubCreatorId = typeof paperRaw.hubId === 'object'
		? (paperRaw.hubId?.createdBy?._id || paperRaw.hubId?.createdBy?.id || paperRaw.hubId?.createdBy)
		: null;
	const isHubOwner = hubCreatorId?.toString() === userId;

	// Para papers "under negotiation" sem hub, qualquer revisor pode ver
	const isOpenReviewer = !paperRaw.hubId && locals.user.roles?.reviewer === true;

	if (!isHubReviewer && !isHubOwner && !isOpenReviewer) {
		throw error(403, 'You do not have permission to view this paper');
	}

	// 🔧 Normaliza o campo peer_review (se existir)
	const peer_review = paperRaw.peer_review
		? {
			reviewType: paperRaw.peer_review.reviewType,
			assignedReviewers: paperRaw.peer_review.assignedReviewers ?? [],
			responses: (paperRaw.peer_review.responses ?? []).map((r) => ({
				reviewerId: r.reviewerId,
				status: r.status,
				responseDate: r.responseDate,
				_id: r._id?.toString?.() ?? undefined
			})),
			reviews: paperRaw.peer_review.reviews ?? [],
			averageScore: paperRaw.peer_review.averageScore ?? 0,
			reviewCount: paperRaw.peer_review.reviewCount ?? 0,
			reviewStatus: paperRaw.peer_review.reviewStatus ?? 'not_started'
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
		...paperRaw,
		peer_review
	};

	const users = await Users.find({}, {}).lean().exec();

	return {
		paper,
		users
	};
}

export const actions = {
	default: async ({ locals /* , params, request */ }) => {
		if (!locals.user) error(401);

	}
};