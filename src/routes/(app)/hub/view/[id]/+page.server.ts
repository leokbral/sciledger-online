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
        const papers = await Papers.find({
            $or: [
                { coAuthors: locals.user.id },  // User is contributing author
                { mainAuthor: locals.user.id },  // O usuário como autor principal
                { correspondingAuthor: locals.user.id },  // O usuário como autor correspondente
            ]
        })
            .populate("mainAuthor")
            .populate("coAuthors")
            .populate("submittedBy")  // Added submittedBy population
            .lean()
            .exec();

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