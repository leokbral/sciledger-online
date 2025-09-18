import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) throw redirect(302, '/login'); // ✅ corrigido

	await start_mongo();

	const fetchUsers = async () => {
		return await Users.find({}, {}).lean().exec();
	};

	const fetchPapers = async () => {
		const papersRaw = await Papers.find({})
			.populate("mainAuthor")
			.lean()
			.exec();

		const normalizedPapers = papersRaw.map((paper) => {
			const peer_review = paper.peer_review
				? {
						reviewType: paper.peer_review.reviewType,
						assignedReviewers: paper.peer_review.assignedReviewers ?? [],
						responses: (paper.peer_review.responses ?? []).map((r: any) => ({
							reviewerId: r.reviewerId,
							status: r.status,
							responseDate: r.responseDate,
							_id: r._id?.toString?.()
						})),
						reviews: paper.peer_review.reviews ?? [],
						averageScore: paper.peer_review.averageScore ?? 0,
						reviewCount: paper.peer_review.reviewCount ?? 0,
						reviewStatus: paper.peer_review.reviewStatus ?? 'not_started'
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

			return {
				...paper,
				peer_review
			};
		});

		return normalizedPapers;
	};

	const fetchReviews = async (reviewerId: string) => {
		return await Reviews.find({ reviewer: reviewerId }).lean().exec();
	};

	const [users, papers, reviews] = await Promise.all([
		fetchUsers(),
		fetchPapers(),
		fetchReviews(user._id)
	]);

	return {
		users,
		papers,
		reviews,
		user
	};
}
