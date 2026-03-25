import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/login');
	}

	await start_mongo();

	const userDoc = await Users.findOne({ id: user.id })
		.select('roles reviewerPayments firstName lastName email username')
		.lean();

	const reviewerPayments = userDoc?.reviewerPayments
		? {
				stripeConnectAccountId: userDoc.reviewerPayments.stripeConnectAccountId ?? '',
				onboardingComplete: !!userDoc.reviewerPayments.onboardingComplete,
				detailsSubmitted: !!userDoc.reviewerPayments.detailsSubmitted,
				chargesEnabled: !!userDoc.reviewerPayments.chargesEnabled,
				payoutsEnabled: !!userDoc.reviewerPayments.payoutsEnabled,
				defaultCurrency: userDoc.reviewerPayments.defaultCurrency ?? 'brl',
				totalEarnedCents: Number(userDoc.reviewerPayments.totalEarnedCents ?? 0),
				totalPaidOutCents: Number(userDoc.reviewerPayments.totalPaidOutCents ?? 0),
				pendingPayoutCents: Number(userDoc.reviewerPayments.pendingPayoutCents ?? 0),
				onboardingStartedAt: userDoc.reviewerPayments.onboardingStartedAt ?? null,
				onboardingCompletedAt: userDoc.reviewerPayments.onboardingCompletedAt ?? null,
				lastPayoutAt: userDoc.reviewerPayments.lastPayoutAt ?? null
			}
		: null;

	return {
		user: {
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			username: user.username
		},
		isReviewer: !!userDoc?.roles?.reviewer,
		reviewerPayments
	};
};
