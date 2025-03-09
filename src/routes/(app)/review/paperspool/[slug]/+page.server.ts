import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, params }) {
    if (!locals.user) redirect(302, `/login`);

    const paper = await Papers.findOne({ id: params.slug }, {})
        .populate("authors")
        .populate("mainAuthor")
        .populate("coAuthors")
        .populate('reviewers')
        .lean()
        .exec();

    if (!paper) {
        throw error(404, 'Paper not found');
    }

    // Check if the logged-in user is assigned to review this paper or is the main author
    const isAssignedReviewer = paper.reviewers?.some(
        reviewer => reviewer.id.toString() === locals.user._id.toString()
    );

    const isMainAuthor = paper.mainAuthor?.id.toString() === locals.user._id.toString();

    if (!isAssignedReviewer && !isMainAuthor) {
        throw error(403, 'You are not authorized to view this paper');
    }

    const fetchUsers = async () => {
        const users = await Users.find({},{}).lean().exec();
        return users;
    };

    return {
        paper,
        users: await fetchUsers(),
        isReviewer: isAssignedReviewer,
        isMainAuthor
    }
}

export const actions = {
	default: async ({ locals /* , params, request */ }) => {
		if (!locals.user) error(401);

	}
};