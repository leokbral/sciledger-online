import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import { redirect } from '@sveltejs/kit';
import Papers from '$lib/db/models/Paper';

export async function load({ locals }) {
    console.log("chegou aqui");

    if (!locals.user) redirect(302, `/login`);

    await start_mongo();

    // Função para buscar os usuários
    const fetchUsers = async () => {
        const users = await Users.find({}, {}).lean().exec();
        return users;
    };

    // Função para buscar os papers
    const fetchPapers = async () => {
        const papersRaw = await Papers.find({
            $or: [
                { coAuthors: locals.user.id },  // O usuário como coautor
                { mainAuthor: locals.user.id },  // O usuário como autor principal
                { correspondingAuthor: locals.user.id }  // O usuário como autor correspondente
            ]
        })
            .populate("mainAuthor")
            .populate("coAuthors")  // Populando os coautores
            .populate("correspondingAuthor")
            .lean()
            .exec();

        // Normalizar peer_review para cada paper
        const papers = papersRaw.map((paper) => {
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

    return {
        users: await fetchUsers(),
        papers: await fetchPapers()
    };
}
