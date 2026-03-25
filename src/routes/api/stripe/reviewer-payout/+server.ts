import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Reviews from '$lib/db/models/Review';
import Users from '$lib/db/models/User';
import type { User } from '$lib/types/User';
import {
	createReviewerTransfer,
	getConnectedAccountStatus,
	getReviewerPayoutAmountCents,
	getStripeClient
} from '$lib/services/stripeConnect';

type ReviewerPaymentsRecord = {
	stripeConnectAccountId: string;
	onboardingComplete: boolean;
	detailsSubmitted: boolean;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	defaultCurrency: string;
	totalEarnedCents: number;
	totalPaidOutCents: number;
	pendingPayoutCents: number;
	onboardingStartedAt?: Date;
	onboardingCompletedAt?: Date;
	lastPayoutAt?: Date;
};

type PaperReviewResponse = {
	reviewerId?: string;
	payoutStatus?: 'pending' | 'pending_connect' | 'paid' | 'failed';
	payoutFailureReason?: string | null;
	payoutAmount?: number;
	payoutTransferId?: string;
	payoutAt?: Date;
};

function normalizeReviewerPayments(
	input: User['reviewerPayments'] | null | undefined
): ReviewerPaymentsRecord {
	return {
		stripeConnectAccountId: input?.stripeConnectAccountId ?? '',
		onboardingComplete: !!input?.onboardingComplete,
		detailsSubmitted: !!input?.detailsSubmitted,
		chargesEnabled: !!input?.chargesEnabled,
		payoutsEnabled: !!input?.payoutsEnabled,
		defaultCurrency: input?.defaultCurrency ?? 'brl',
		totalEarnedCents: Number(input?.totalEarnedCents ?? 0),
		totalPaidOutCents: Number(input?.totalPaidOutCents ?? 0),
		pendingPayoutCents: Number(input?.pendingPayoutCents ?? 0),
		onboardingStartedAt: input?.onboardingStartedAt,
		onboardingCompletedAt: input?.onboardingCompletedAt,
		lastPayoutAt: input?.lastPayoutAt
	};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const body = await request.json();
		const paperId = body?.paperId as string | undefined;
		const reviewerId = (body?.reviewerId as string | undefined) ?? user.id;

		if (!paperId) {
			return json({ error: 'Must provide `paperId`' }, { status: 400 });
		}

		if (reviewerId !== user.id) {
			return json({ error: 'You can only request payout for your own reviews' }, { status: 403 });
		}

		const paperDoc = await Papers.findOne({ id: paperId });
		if (!paperDoc) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const finalReview = await Reviews.findOne({
			paperId,
			reviewerId,
			reviewRound: 2,
			status: 'submitted'
		}).sort({ submissionDate: -1 });

		if (!finalReview) {
			return json({
				error: 'No completed final review (round 2) found for this reviewer and paper'
			}, { status: 400 });
		}

		const responses = (paperDoc.peer_review?.responses ?? []) as PaperReviewResponse[];
		const reviewerResponse = responses.find((r) => String(r?.reviewerId ?? '') === reviewerId);
		if (!reviewerResponse) {
			return json({ error: 'Reviewer response not found on paper' }, { status: 400 });
		}

		if (reviewerResponse.payoutStatus === 'paid' && reviewerResponse.payoutTransferId) {
			return json({
				success: true,
				message: 'Payout already processed for this review',
				transferId: reviewerResponse.payoutTransferId,
				paidAt: reviewerResponse.payoutAt
			});
		}

		const reviewerDoc = await Users.findOne({ id: reviewerId });
		if (!reviewerDoc) {
			return json({ error: 'Reviewer not found' }, { status: 404 });
		}

		const payments = normalizeReviewerPayments(reviewerDoc.reviewerPayments);
		if (!payments.stripeConnectAccountId) {
			reviewerResponse.payoutStatus = 'pending_connect';
			reviewerResponse.payoutFailureReason = 'Reviewer has not connected Stripe account';
			reviewerResponse.payoutAmount = getReviewerPayoutAmountCents();
			payments.pendingPayoutCents += getReviewerPayoutAmountCents();
			reviewerDoc.reviewerPayments = payments;
			await reviewerDoc.save();
			await paperDoc.save();

			return json({
				error: 'Reviewer Stripe Connect account is not configured',
				requiresOnboarding: true
			}, { status: 400 });
		}

		const stripe = getStripeClient();
		if (!stripe) {
			return json({ error: 'Stripe is not configured on the server' }, { status: 500 });
		}

		const accountStatus = await getConnectedAccountStatus(stripe, payments.stripeConnectAccountId);
		if (!accountStatus.onboardingComplete) {
			reviewerResponse.payoutStatus = 'pending_connect';
			reviewerResponse.payoutFailureReason = 'Stripe account onboarding is not complete';
			reviewerResponse.payoutAmount = getReviewerPayoutAmountCents();
			payments.pendingPayoutCents += getReviewerPayoutAmountCents();
			payments.detailsSubmitted = accountStatus.detailsSubmitted;
			payments.chargesEnabled = accountStatus.chargesEnabled;
			payments.payoutsEnabled = accountStatus.payoutsEnabled;
			payments.onboardingComplete = accountStatus.onboardingComplete;
			payments.defaultCurrency = accountStatus.defaultCurrency;
			reviewerDoc.reviewerPayments = payments;
			await reviewerDoc.save();
			await paperDoc.save();

			return json({
				error: 'Stripe account onboarding is incomplete',
				requiresOnboarding: true,
				accountStatus
			}, { status: 400 });
		}

		const payoutAmount = getReviewerPayoutAmountCents();
		const transfer = await createReviewerTransfer(stripe, {
			amount: payoutAmount,
			currency: 'brl',
			destinationAccountId: payments.stripeConnectAccountId,
			paperId,
			reviewerId,
			reviewId: finalReview.id,
			reviewRound: 2
		});

		reviewerResponse.payoutStatus = 'paid';
		reviewerResponse.payoutTransferId = transfer.id;
		reviewerResponse.payoutAmount = payoutAmount;
		reviewerResponse.payoutAt = new Date();
		reviewerResponse.payoutFailureReason = null;
		await paperDoc.save();

		payments.totalEarnedCents += payoutAmount;
		payments.totalPaidOutCents += payoutAmount;
		payments.pendingPayoutCents = Math.max(0, payments.pendingPayoutCents - payoutAmount);
		payments.lastPayoutAt = new Date();
		payments.detailsSubmitted = accountStatus.detailsSubmitted;
		payments.chargesEnabled = accountStatus.chargesEnabled;
		payments.payoutsEnabled = accountStatus.payoutsEnabled;
		payments.onboardingComplete = accountStatus.onboardingComplete;
		payments.defaultCurrency = accountStatus.defaultCurrency;
		reviewerDoc.reviewerPayments = payments;
		await reviewerDoc.save();

		return json({
			success: true,
			message: 'Reviewer payout processed successfully',
			paperId,
			reviewerId,
			amount: payoutAmount,
			currency: 'brl',
			transferId: transfer.id
		});
	} catch (error: unknown) {
		console.error('Error processing reviewer payout:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: `Failed to process payout: ${message}` }, { status: 500 });
	}
};
