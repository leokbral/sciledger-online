import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { getConnectedAccountStatus, getStripeClient } from '$lib/services/stripeConnect';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const userDoc = await Users.findOne({ id: user.id }).lean();
		if (!userDoc) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const reviewerPayments = userDoc.reviewerPayments ?? {};
		const accountId = reviewerPayments.stripeConnectAccountId as string | undefined;

		if (!accountId) {
			return json({
				success: true,
				connected: false,
				reviewerPayments
			});
		}

		const stripe = getStripeClient();
		if (!stripe) {
			return json({
				success: true,
				connected: true,
				reviewerPayments,
				warning: 'Stripe not configured on server. Returning local status only.'
			});
		}

		let liveStatus;
		try {
			liveStatus = await getConnectedAccountStatus(stripe, accountId);
		} catch (error) {
			console.error('Failed to retrieve Stripe account status:', error);
			return json({
				success: true,
				connected: true,
				reviewerPayments,
				warning: 'Could not fetch live account status from Stripe'
			});
		}

		const updated = {
			...reviewerPayments,
			onboardingComplete: liveStatus.onboardingComplete,
			detailsSubmitted: liveStatus.detailsSubmitted,
			chargesEnabled: liveStatus.chargesEnabled,
			payoutsEnabled: liveStatus.payoutsEnabled,
			defaultCurrency: liveStatus.defaultCurrency,
			onboardingCompletedAt: liveStatus.onboardingComplete
				? reviewerPayments.onboardingCompletedAt ?? new Date()
				: reviewerPayments.onboardingCompletedAt
		};

		await Users.updateOne({ id: user.id }, { $set: { reviewerPayments: updated } });

		return json({
			success: true,
			connected: true,
			accountStatus: liveStatus,
			reviewerPayments: updated
		});
	} catch (error: unknown) {
		console.error('Error checking Stripe Connect status:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to get account status: ${message}` }, { status: 500 });
	}
};
