import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export type ConnectedAccountStatus = {
	accountId: string;
	detailsSubmitted: boolean;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	onboardingComplete: boolean;
	defaultCurrency: string;
};

export function getStripeClient(): Stripe | null {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		return null;
	}
	return new Stripe(stripeSecretKey);
}

export function getReviewerPayoutAmountCents(): number {
	const rawValue = env.REVIEWER_PAYOUT_BRL_CENTS;
	const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	return 8000;
}

export async function getConnectedAccountStatus(
	stripe: Stripe,
	accountId: string
): Promise<ConnectedAccountStatus> {
	const account = await stripe.accounts.retrieve(accountId);
	const detailsSubmitted = !!account.details_submitted;
	const chargesEnabled = !!account.charges_enabled;
	const payoutsEnabled = !!account.payouts_enabled;
	const onboardingComplete = detailsSubmitted && chargesEnabled && payoutsEnabled;

	return {
		accountId,
		detailsSubmitted,
		chargesEnabled,
		payoutsEnabled,
		onboardingComplete,
		defaultCurrency: account.default_currency ?? 'brl'
	};
}

export async function createExpressConnectedAccount(
	stripe: Stripe,
	input: {
		email: string;
		country?: string;
		reviewerId: string;
	}
): Promise<Stripe.Account> {
	return stripe.accounts.create({
		type: 'express',
		country: input.country ?? 'BR',
		email: input.email,
		capabilities: {
			card_payments: { requested: true },
			transfers: { requested: true }
		},
		metadata: {
			reviewerId: input.reviewerId,
			platform: 'sciledger'
		}
	});
}

export async function createConnectOnboardingLink(
	stripe: Stripe,
	accountId: string,
	input: {
		returnUrl: string;
		refreshUrl: string;
	}
): Promise<string> {
	const accountLink = await stripe.accountLinks.create({
		account: accountId,
		return_url: input.returnUrl,
		refresh_url: input.refreshUrl,
		type: 'account_onboarding'
	});
	return accountLink.url;
}

export async function createConnectDashboardLink(stripe: Stripe, accountId: string): Promise<string> {
	const loginLink = await stripe.accounts.createLoginLink(accountId);
	return loginLink.url;
}

export async function createReviewerTransfer(
	stripe: Stripe,
	input: {
		amount: number;
		currency?: string;
		destinationAccountId: string;
		paperId: string;
		reviewerId: string;
		reviewId: string;
		reviewRound: number;
	}
): Promise<Stripe.Transfer> {
	return stripe.transfers.create({
		amount: input.amount,
		currency: input.currency ?? 'brl',
		destination: input.destinationAccountId,
		metadata: {
			paperId: input.paperId,
			reviewerId: input.reviewerId,
			reviewId: input.reviewId,
			reviewRound: String(input.reviewRound),
			type: 'reviewer_payout'
		}
	});
}
