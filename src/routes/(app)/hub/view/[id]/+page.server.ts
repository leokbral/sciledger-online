import { start_mongo } from '$lib/db/mongooseConnection';
import { redirect, error } from '@sveltejs/kit';
import Users from '$lib/db/models/User';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';

export async function load({ params, locals }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const fetchHub = async () => {
		const hub = await Hubs.findById(params.id)
			.populate('createdBy', 'name email')
			.populate('reviewers', '_id firstName lastName email profilePictureUrl')
			.lean();

		if (!hub) {
			throw error(404, 'Hub not found');
		}

		return hub;
	};

	const fetchUsers = async () => {
		const users = await Users.find({}, {}).lean().exec();
		return users;
	};

	const fetchPapers = async () => {
		const hub = await Hubs.findById(params.id).lean();
		if (!hub) {
			throw error(404, 'Hub not found');
		}
		const isCreator = hub.createdBy.toString() === locals.user.id;
		const isReviewer = hub.reviewers?.includes(locals.user.id);

		// Buscar papers que o usuário aceitou revisar via ReviewQueue
		const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
		const acceptedReviews = await ReviewQueue.find({
			reviewer: locals.user.id,
			hubId: params.id,
			status: 'accepted'
		}).lean();
		const acceptedPaperIds = acceptedReviews.map(r => r.paperId);

		const paperQuery = isCreator || isReviewer
			? { hubId: params.id }
			: {
				hubId: params.id,
				$or: [
					{ status: 'published' },
					{ id: { $in: acceptedPaperIds } }, // Adicionar papers aceitos para revisão
					{
						status: { $ne: 'published' },
						$or: [
							{ mainAuthor: locals.user.id },
							{ correspondingAuthor: locals.user.id },
							{ coAuthors: locals.user.id },
							{ submittedBy: locals.user.id }
						]
					}
				]
			};

		const papersRaw = await Papers.find(paperQuery)
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("submittedBy")
			.lean()
			.exec();

		// Normalizar peer_review para evitar erro de serialização
		const papers = papersRaw.map(paper => {
			const peer_review = paper.peer_review
				? {
					reviewType: paper.peer_review.reviewType,
					assignedReviewers: paper.peer_review.assignedReviewers ?? [],
					responses: paper.peer_review.responses ?? [],
					reviews: paper.peer_review.reviews ?? [],
					averageScore: paper.peer_review.averageScore ?? 0,
					reviewCount: paper.peer_review.reviewCount ?? 0,
					reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
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

			// Marcar se o usuário aceitou revisar este paper
			const isAcceptedForReview = acceptedPaperIds.includes(paper.id);

			return {
				...paper,
				peer_review,
				isAcceptedForReview
			};
		});

		return papers;
	};

	try {
		return {
			hub: await fetchHub(),
			users: await fetchUsers(),
			papers: await fetchPapers()
		};
	} catch (e) {
		console.error('Error loading data:', e);
		throw error(500, 'Error loading page data');
	}
}
