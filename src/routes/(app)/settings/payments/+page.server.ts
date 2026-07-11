import type { PageServerLoad } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		// Unreachable in practice: the parent +layout.server.ts already
		// redirects unauthenticated requests before this load runs.
		return { reviewerPayments: null };
	}

	await start_mongo();

	const userDoc = await Users.findOne({ id: userId }).select('reviewerPayments').lean();

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
		reviewerPayments
	};
};
