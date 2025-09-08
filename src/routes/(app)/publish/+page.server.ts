import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import Papers from '$lib/db/models/Paper';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals.user;
    if (!user) throw redirect(302, '/login');

    await start_mongo();

    const fetchUsers = async () => {
        return await Users.find({}, {}).lean().exec();
    };

    const fetchPapers = async () => {
        const papersRaw = await Papers.find({
            $or: [
                { coAuthors: user.id },
                { mainAuthor: user.id },
                { correspondingAuthor: user.id }
            ]
        })
            .populate("mainAuthor")
            .populate("coAuthors")
            .populate("correspondingAuthor")
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

    return {
        users: await fetchUsers(),
        papers: await fetchPapers(),
        user
    };
}
