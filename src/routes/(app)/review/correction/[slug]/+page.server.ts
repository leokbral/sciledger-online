import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongo';

export async function load({ locals, params }) {
    if (!locals.user) redirect(302, `/login`);

    await start_mongo();

    try {
        // Buscar paper pelo slug (ajuste se o campo correto for outro)
        const paperRaw = await Papers.findOne({ id: params.slug }, {})
            .populate("authors")
            .populate("mainAuthor")
            .populate("coAuthors")
            .lean()
            .exec();

        if (!paperRaw) {
            throw error(404, 'Paper not found');
        }

        // Normalizar peer_review igual ao primeiro código
        const peer_review = paperRaw.peer_review
            ? {
                reviewType: paperRaw.peer_review.reviewType,
                assignedReviewers: paperRaw.peer_review.assignedReviewers ?? [],
                responses: paperRaw.peer_review.responses ?? [],
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

        // Buscar usuários
        const fetchUsers = async () => {
            return await Users.find({}, {}).lean().exec();
        };

        return {
            paper,
            users: await fetchUsers()
        };

    } catch (err) {
        console.error('Error loading paper:', err);
        throw error(500, 'Internal Server Error');
    }
}

export const actions = {
    default: async ({ locals }) => {
        if (!locals.user) throw error(401, 'Unauthorized');
    }
};
