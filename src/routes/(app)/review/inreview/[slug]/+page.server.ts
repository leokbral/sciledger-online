import MessageFeeds from '$lib/db/models/MessageFeed.js';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
//import * as api from '$lib/api.js';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	const id = params.slug
	const paper = await Papers.findOne({ id }, {}).populate("authors").populate("mainAuthor").populate("coAuthors").lean().exec();
	const messageFeed = await MessageFeeds.findOne({id:"597c84b3-d2a8-4fcc-950e-7ffff8739650"},{}).populate('messages.sender').lean().exec();

	const fetchUsers = async () => {
		const users = await Users.find({}, {}).lean().exec();
		return users;
	};

	// const fetchUsersReviewers = async () => {
	// 	 const reviewers = await Users.find({ 'roles.reviewer': true }, { _id: 0 }).lean().exec();
	// 	 return reviewers;
	// };

	return {
		id, user: locals.user, paper, users: await fetchUsers(), messageFeed/* , reviewers: await fetchUsersReviewers() */ // Get only reviewers };

	}
}

export const actions = {
    default: async ({ locals /* , params, request */ }) => {
        if (!locals.user) error(401);
        
        return {
            success: true
        };
    }
};