import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) {
		redirect(302, '/login');
	}

	await start_mongo(); // Pode ser removido se a conexão já estiver gerenciada

	const fetchUsers = async () => {
		return await Users.find({}, {}).lean().exec();
	};

	const fetchPapers = async () => {
		const papersRaw = await Papers.find({}, {})
			.populate("mainAuthor")
			.lean()
			.exec();

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

			return {
				...paper,
				peer_review
			};
		});

		return papers;
	};

	const fetchReviews = async (reviewerId: string) => {
		return await Reviews.find({ reviewer: reviewerId }).lean().exec();
	};

	const reviews = await fetchReviews(user._id);

	return {
		users: await fetchUsers(),
		papers: await fetchPapers(),
		reviews,
		user
	};
}
