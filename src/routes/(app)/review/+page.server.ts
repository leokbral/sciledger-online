import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Reviews from '$lib/db/models/Review';
import Invitations from '$lib/db/models/Invitation';
import { start_mongo } from '$lib/db/mongo';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    const user = locals.user;
    if (!user) { redirect(302, '/login') }

    await start_mongo(); // Não necessário mais

    const fetchUsers = async () => {
        const users = await Users.find({}, {}).lean().exec();
        return users;
    };

    // MUDAR AKI -- CONSERTAR O FILTRO E O POPULATE
    const fetchPapers = async () => {
        const papers = await Papers.find({}, {})
            .populate("mainAuthor")
            .populate("coAuthors")
            .populate("correspondingAuthor")
            .populate("hubId")

            .lean()
            .exec();
        return papers;
    };
    // Buscar as revisões do revisor
    const fetchReviews = async (reviewerId: string) => {
        const reviews = await Reviews.find({ reviewer: reviewerId }).lean().exec();
        return reviews;
    };

    const reviews = await fetchReviews(user.id);  // Passando o _id do usuário como revisor

    const fetchReviewInvitation = async (reviewerId: string) => {
        const invitations = await Invitations.find({ reviewer: reviewerId }).lean().exec();
        console.log('Invitations5:', invitations);
        return invitations;
    };

    return {
        users: await fetchUsers(),
        papers: await fetchPapers(),
        reviews,  // Passando as revisões para o frontend
        user,  // Passando as informações do usuário
        reviewerInvitations: await fetchReviewInvitation(user.id) // Passando as convites de revisão
    };
}
