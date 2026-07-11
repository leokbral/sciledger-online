import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { hasReviewerCapability } from '$lib/server/authorization/reviewerCapability';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	const isReviewer = await hasReviewerCapability(user);

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			username: user.username
		},
		isReviewer
	};
};
