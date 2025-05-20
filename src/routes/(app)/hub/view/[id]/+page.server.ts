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
        // First, get the hub to check if user is creator or reviewer
        const hub = await Hubs.findById(params.id).lean();
        if (!hub) {
            throw error(404, 'Hub not found');
        }
        const isCreator = hub.createdBy.toString() === locals.user.id;
        const isReviewer = hub.reviewers?.includes(locals.user.id);

        // If user is creator or reviewer, show all papers
        if (isCreator || isReviewer) {
            return await Papers.find({ hubId: params.id })
                .populate("mainAuthor")
                .populate("coAuthors")
                .populate("submittedBy")
                .lean()
                .exec();
        }

        // Otherwise, show only published papers or papers where user is involved
        return await Papers.find({
            hubId: params.id,
            $or: [
                { status: 'published' },
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
        })
        .populate("mainAuthor")
        .populate("coAuthors")
        .populate("submittedBy")
        .lean()
        .exec();
    };
    

    try {
        return {
            // user: locals.user,
            hub: await fetchHub(),
            users: await fetchUsers(),
            papers: await fetchPapers()
        };
    } catch (e) {
        console.error('Error loading data:', e);
        throw error(500, 'Error loading page data');
    }
}