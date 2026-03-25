import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	createConnectOnboardingLink,
	createExpressConnectedAccount,
	getConnectedAccountStatus,
	getStripeClient
} from '$lib/services/stripeConnect';
import { env } from '$env/dynamic/private';

function isConnectNotEnabledError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	const message = error.message.toLowerCase();
	return (
		message.includes("signed up for connect") ||
		message.includes('create new accounts if you\'ve signed up for connect') ||
		message.includes('you can only create new accounts')
	);
}

export const POST: RequestHandler = async ({ locals, url }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		if (!user.roles?.reviewer) {
			return json({ error: 'Only reviewers can connect Stripe accounts' }, { status: 403 });
		}

		const stripe = getStripeClient();
		if (!stripe) {
			return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
		}

		const userDoc = await Users.findOne({ id: user.id });
		if (!userDoc) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		let accountId = userDoc.reviewerPayments?.stripeConnectAccountId as string | undefined;
		if (!accountId) {
			const connectedAccount = await createExpressConnectedAccount(stripe, {
				email: userDoc.email,
				country: 'BR',
				reviewerId: user.id
			});
			accountId = connectedAccount.id;
		}

		const siteBase = env.SITE_URL || `${url.protocol}//${url.host}`;
		const refreshUrl = `${siteBase}/settings?connect=refresh`;
		const returnUrl = `${siteBase}/settings?connect=return`;
		const onboardingUrl = await createConnectOnboardingLink(stripe, accountId, {
			returnUrl,
			refreshUrl
		});

		const accountStatus = await getConnectedAccountStatus(stripe, accountId);
		userDoc.reviewerPayments = {
			...(userDoc.reviewerPayments?.toObject?.() ?? userDoc.reviewerPayments ?? {}),
			stripeConnectAccountId: accountId,
			onboardingComplete: accountStatus.onboardingComplete,
			detailsSubmitted: accountStatus.detailsSubmitted,
			chargesEnabled: accountStatus.chargesEnabled,
			payoutsEnabled: accountStatus.payoutsEnabled,
			defaultCurrency: accountStatus.defaultCurrency,
			onboardingStartedAt: userDoc.reviewerPayments?.onboardingStartedAt ?? new Date(),
			onboardingCompletedAt: accountStatus.onboardingComplete
				? userDoc.reviewerPayments?.onboardingCompletedAt ?? new Date()
				: userDoc.reviewerPayments?.onboardingCompletedAt
		};

		await userDoc.save();

		return json({
			success: true,
			onboardingUrl,
			accountId,
			accountStatus
		});
	} catch (error: unknown) {
		console.error('Error creating Stripe Connect onboarding link:', error);

		if (isConnectNotEnabledError(error)) {
			return json(
				{
					error:
						'Pagamento para revisores esta temporariamente indisponivel. Tente novamente mais tarde.',
					code: 'connect_unavailable'
				},
				{ status: 400 }
			);
		}

		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to create onboarding link: ${message}` }, { status: 500 });
	}
};
