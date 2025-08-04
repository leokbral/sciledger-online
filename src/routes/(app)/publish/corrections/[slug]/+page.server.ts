import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) redirect(302, `/login`);

    const id = params.slug;

    // Buscar o Paper baseado no ID (params.slug)
    const paper = await Papers.findOne({ id }, {})
        .populate("authors")
        .populate("mainAuthor")
        .populate("coAuthors")
        .lean()
        .exec();

    // Normalizar peer_review para o paper
    const normalizedPaper = paper ? {
        ...paper,
        peer_review: paper.peer_review
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
            }
    } : null;

    // Buscar o MessageFeed (Usando um ID fixo ou passando um ID dinâmico)
    const messageFeed = await MessageFeeds.findOne({ id: "597c84b3-d2a8-4fcc-950e-7ffff8739650" }, {})
        .populate('messages.sender')
        .lean()
        .exec();

    // Função para buscar os usuários
    const fetchUsers = async () => {
        const users = await Users.find({}, {}).lean().exec();
        return users;
    };

    return {
        id,
        user: locals.user,
        paper: normalizedPaper,  // Retornando o paper normalizado
        users: await fetchUsers(),
        messageFeed
    };
}

export const actions = {
    default: async ({ locals }) => {
        if (!locals.user) error(401);
    }
};
