import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import Invitations from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals.user;
    if (!user) redirect(302, '/login');

    await start_mongo(); // Pode ser removido se já estiver conectado

    const fetchUsers = async () => {
        return await Users.find({}, {}).lean().exec();
    };

    const fetchPapers = async () => {
        const papersRaw = await Papers.find({}, {})
            .populate("mainAuthor")
            .populate("coAuthors")
            .populate("correspondingAuthor")
            .populate("hubId")
            .lean()
            .exec();

        // Normalizar peer_review para cada paper
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

        const filteredPapers = normalizedPapers.filter((paper) => {
            const responses = paper.peer_review.responses;
            const acceptedCount = responses.filter(
                (r) => r.status === 'accepted' || r.status === 'completed'
            ).length;

            return acceptedCount < 3;
        });
        return filteredPapers;
    };

    const fetchReviews = async (reviewerId: string) => {
        return await Reviews.find({ reviewer: reviewerId }).lean().exec();
    };

    const fetchReviewInvitation = async (reviewerId: string) => {
        const invitations = await Invitations.find({ reviewer: reviewerId }).lean().exec();
        console.log('Invitations5:', invitations);
        return invitations;
    };

    return {
        users: await fetchUsers(),
        papers: await fetchPapers(),
        reviews: await fetchReviews(user.id),
        user,
        reviewerInvitations: await fetchReviewInvitation(user.id)
    };
}
