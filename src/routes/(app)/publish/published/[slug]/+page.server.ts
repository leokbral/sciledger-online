import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';

export async function load({ locals, params }) {
    if (!locals.user) redirect(302, `/login`);

    await start_mongo();

    const paper = await Papers.findOne({ id: params.slug })
        .populate("authors")
        .populate("mainAuthor")
        .populate("coAuthors")
        // Only populate hub if hubId exists and isLinkedToHub is true
        .populate({
            path: 'hubId',
            match: { isLinkedToHub: true }
        })
        .lean()
        .exec();

    if (!paper) {
        throw error(404, 'Paper not found');
    }

    const fetchUsers = async () => {
        const users = await Users.find({}, {}).lean().exec();
        return users;
    };

    return {
        paper,
        users: await fetchUsers()
    };
}

export const actions = {
    default: async ({ locals }) => {
        if (!locals.user) error(401);
    }
};