import crypto from 'crypto';
import type Stripe from 'stripe';
import PaymentAttempts from '$lib/db/models/PaymentAttempt';
import Papers from '$lib/db/models/Paper';
import { emitEvent } from '$lib/services/EventService';
import type { PaymentAttemptPurpose } from '$lib/types/PaymentAttempt';

export const AUTHORIZATION_DURATION_DAYS = 7;
export const RENEWAL_BEFORE_EXPIRATION_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

type AuthorizationAttemptLike = {
	id?: string;
	_id?: string;
	paperId?: string;
	userId?: string;
	hubId?: string | null;
	purpose?: PaymentAttemptPurpose;
	providerPaymentIntentId?: string;
	providerPaymentMethodId?: string;
	providerCustomerId?: string;
	amountCents?: number;
	currency?: string;
	status?: string;
	captureMethod?: string;
	authorizationExpiresAt?: Date | string | null;
	expiresAt?: Date | string | null;
	renewalCount?: number;
};

function asDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
	return new Date(date.getTime() + days * DAY_MS);
}

export function getAuthorizationExpiresAt(now = new Date()) {
	return addDays(now, AUTHORIZATION_DURATION_DAYS);
}

export function getAuthorizationRenewalDueAt(expiresAt: Date) {
	return new Date(expiresAt.getTime() - RENEWAL_BEFORE_EXPIRATION_DAYS * DAY_MS);
}

export function hasReviewerFoundForPaper(paper: any) {
	const reviewers = Array.isArray(paper?.reviewers) ? paper.reviewers : [];
	const assignedReviewers = Array.isArray(paper?.peer_review?.assignedReviewers)
		? paper.peer_review.assignedReviewers
		: [];
	const acceptedResponses = Array.isArray(paper?.peer_review?.responses)
		? paper.peer_review.responses.filter((response: any) =>
				['accepted', 'completed'].includes(String(response?.status ?? ''))
			)
		: [];
	const occupiedSlots = Array.isArray(paper?.reviewSlots)
		? paper.reviewSlots.filter((slot: any) => String(slot?.status ?? '') === 'occupied')
		: [];

	return (
		reviewers.length > 0 ||
		assignedReviewers.length > 0 ||
		acceptedResponses.length > 0 ||
		occupiedSlots.length > 0
	);
}

export function shouldRenewAuthorization(
	attempt: AuthorizationAttemptLike | null | undefined,
	paper: any,
	now = new Date()
) {
	if (!attempt || attempt.status !== 'authorized') return false;
	if (attempt.captureMethod !== 'manual') return false;
	if (!attempt.providerPaymentIntentId || !attempt.providerPaymentMethodId) return false;
	if (paper?.status !== 'reviewer assignment') return false;
	if (hasReviewerFoundForPaper(paper)) return false;

	const expiresAt = asDate(attempt.authorizationExpiresAt ?? attempt.expiresAt);
	if (!expiresAt) return false;

	return getAuthorizationRenewalDueAt(expiresAt).getTime() <= now.getTime();
}

export function shouldStopAuthorizationRenewal(
	attempt: AuthorizationAttemptLike | null | undefined,
	paper: any
) {
	if (!attempt) return true;
	if (['captured', 'failed', 'cancelled', 'expired'].includes(String(attempt.status))) return true;
	if (paper?.status !== 'reviewer assignment') return true;
	return hasReviewerFoundForPaper(paper);
}

export async function renewManualAuthorization(options: {
	stripe: Stripe;
	attempt: AuthorizationAttemptLike;
	paper: any;
	idempotencyKey?: string;
	now?: Date;
}) {
	const now = options.now ?? new Date();
	const { stripe, attempt, paper } = options;

	if (!shouldRenewAuthorization(attempt, paper, now)) {
		return { renewed: false as const, reason: 'not_due' };
	}

	const oldPaymentIntentId = String(attempt.providerPaymentIntentId);
	const newAttemptId = crypto.randomUUID();
	const authorizationExpiresAt = getAuthorizationExpiresAt(now);

	await stripe.paymentIntents.cancel(oldPaymentIntentId, undefined, {
		idempotencyKey: `${options.idempotencyKey ?? newAttemptId}:cancel`
	});

	await PaymentAttempts.updateOne(
		{ $or: [{ id: attempt.id }, { _id: attempt._id }] },
		{
			$set: {
				status: 'cancelled',
				cancelledAt: now,
				isCurrent: false,
				renewalStoppedAt: now,
				renewalStoppedReason: 'renewed'
			},
			$push: {
				statusHistory: {
					status: 'cancelled',
					providerStatus: 'canceled',
					message: 'Manual authorization renewed before expiration.',
					createdAt: now
				}
			}
		}
	);

	const newPaymentIntent = await stripe.paymentIntents.create(
		{
			amount: Number(attempt.amountCents),
			currency: String(attempt.currency ?? 'brl'),
			customer: attempt.providerCustomerId,
			payment_method: attempt.providerPaymentMethodId,
			confirm: true,
			off_session: true,
			capture_method: 'manual',
			metadata: {
				paperId: String(attempt.paperId),
				userId: String(attempt.userId),
				hubId: attempt.hubId ? String(attempt.hubId) : '',
				purpose: String(attempt.purpose),
				renewedFromAttemptId: String(attempt.id || attempt._id)
			}
		},
		{ idempotencyKey: `${options.idempotencyKey ?? newAttemptId}:create` }
	);

	const renewedAttempt = new PaymentAttempts({
		_id: newAttemptId,
		id: newAttemptId,
		paperId: String(attempt.paperId),
		userId: String(attempt.userId),
		hubId: attempt.hubId ?? null,
		purpose: attempt.purpose,
		provider: 'stripe',
		providerPaymentIntentId: newPaymentIntent.id,
		providerPaymentMethodId: attempt.providerPaymentMethodId,
		providerCustomerId: attempt.providerCustomerId,
		providerStatus: newPaymentIntent.status,
		captureMethod: 'manual',
		amountCents: newPaymentIntent.amount,
		currency: newPaymentIntent.currency,
		status: newPaymentIntent.status === 'requires_capture' ? 'authorized' : 'processing',
		isCurrent: true,
		paymentMethodSaved: true,
		authorizationDurationDays: AUTHORIZATION_DURATION_DAYS,
		renewalBeforeExpirationDays: RENEWAL_BEFORE_EXPIRATION_DAYS,
		authorizationExpiresAt,
		expiresAt: authorizationExpiresAt,
		renewalCount: Number(attempt.renewalCount ?? 0) + 1,
		renewedFromAttemptId: String(attempt.id || attempt._id),
		metadata: {
			policy: 'manual_authorization_renewal'
		},
		statusHistory: [
			{
				status: newPaymentIntent.status === 'requires_capture' ? 'authorized' : 'processing',
				providerStatus: newPaymentIntent.status,
				message: 'Manual authorization renewed.',
				createdAt: now
			}
		],
		createdAt: now,
		updatedAt: now,
		authorizedAt: newPaymentIntent.status === 'requires_capture' ? now : undefined
	});
	await renewedAttempt.save();

	await Papers.updateOne(
		{ $or: [{ id: attempt.paperId }, { _id: attempt.paperId }] },
		{
			$set: {
				paymentHold: {
					stripePaymentIntentId: newPaymentIntent.id,
					purpose: attempt.purpose,
					paymentMethodId: attempt.providerPaymentMethodId,
					customerId: attempt.providerCustomerId,
					captureMethod: 'manual',
					status: newPaymentIntent.status === 'requires_capture' ? 'authorized' : 'pending',
					amount: newPaymentIntent.amount,
					currency: newPaymentIntent.currency,
					authorizedAt: newPaymentIntent.status === 'requires_capture' ? now : undefined,
					authorizationExpiresAt,
					renewalCount: Number(attempt.renewalCount ?? 0) + 1
				}
			}
		}
	);

	try {
		await emitEvent({
			type: 'payment.authorization.renewed',
			actorId: null,
			recipients: [String(attempt.userId)],
			entityType: 'paper',
			entityId: String(attempt.paperId),
			metadata: {
				paperId: String(attempt.paperId),
				hubId: attempt.hubId ?? null,
				oldPaymentIntentId,
				newPaymentIntentId: newPaymentIntent.id,
				amount: newPaymentIntent.amount,
				currency: newPaymentIntent.currency,
				authorizationExpiresAt: authorizationExpiresAt.toISOString(),
				renewalCount: Number(attempt.renewalCount ?? 0) + 1
			}
		});
	} catch (error) {
		console.error('Failed to emit payment authorization renewal event:', error);
	}

	return { renewed: true as const, attempt: renewedAttempt, paymentIntent: newPaymentIntent };
}
