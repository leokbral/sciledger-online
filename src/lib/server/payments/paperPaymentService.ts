import crypto from 'crypto';
import type mongoose from 'mongoose';
import type Stripe from 'stripe';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import PaymentAttempts from '$lib/db/models/PaymentAttempt';
import { hasHubPublication } from '$lib/helpers/paperPublicationModel';
import type {
	PaperPaymentPolicy,
	PaymentAttemptPurpose,
	PaymentAttemptStatus
} from '$lib/types/PaymentAttempt';
import { getPaperPaymentConfig, getStandaloneSubmissionPaymentConfig } from './paymentConfig';
import { getStripeClient } from './stripeClient';

export const STANDALONE_SUBMISSION_PURPOSE: PaymentAttemptPurpose = 'standalone_submission';
export const DEFAULT_HUB_PAYMENT_POLICY: PaperPaymentPolicy = 'publication';
export const PLATFORM_PAYMENT_POLICY_VERSION = 'platform-paper-payment-v1';

export type PaperPaymentState =
	| 'not_required'
	| 'required'
	| 'unpaid'
	| 'processing'
	| 'requires_action'
	| 'authorized'
	| 'captured'
	| 'failed'
	| 'cancelled'
	| 'retry_required';

export type QueryOptions = {
	session?: mongoose.ClientSession | null;
};

export class PaymentDomainError extends Error {
	status: number;
	code: string;
	details?: Record<string, unknown>;

	constructor(
		message: string,
		status = 400,
		code = 'paper_payment_error',
		details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'PaymentDomainError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

function paperLookup(paperId: string) {
	return { $or: [{ id: String(paperId) }, { _id: String(paperId) }] };
}

function maybeSession<T>(query: T, session?: mongoose.ClientSession | null) {
	const sessionableQuery = query as T & { session?: (session: mongoose.ClientSession | null) => T };
	return session && sessionableQuery.session ? sessionableQuery.session(session) : query;
}

function normalizeId(value: any): string {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return String(value);
}

function uniqueIds(values: unknown[]) {
	return [...new Set(values.map(normalizeId).filter(Boolean))];
}

function getPaperAuthorAliases(paper: any) {
	return uniqueIds([
		paper?.submittedBy,
		paper?.mainAuthor,
		paper?.correspondingAuthor,
		...(Array.isArray(paper?.coAuthors) ? paper.coAuthors : []),
		...(Array.isArray(paper?.authors) ? paper.authors : [])
	]);
}

function getHubIdFromPaper(paper: any) {
	const hubId = normalizeId(paper?.hubId);
	const hub = normalizeId(paper?.hub);
	return hubId || hub || null;
}

function isValidPaperPaymentPolicy(value: unknown): value is PaperPaymentPolicy {
	return value === 'submission' || value === 'review' || value === 'publication';
}

function stateRequiresRetry(status: string | undefined) {
	return status === 'failed' || status === 'cancelled' || status === 'expired';
}

function chargeReceiptUrl(paymentIntent: Stripe.PaymentIntent) {
	const latestCharge = paymentIntent.latest_charge as Stripe.Charge | string | null | undefined;
	if (latestCharge && typeof latestCharge === 'object' && 'receipt_url' in latestCharge) {
		return latestCharge.receipt_url ?? undefined;
	}
	return undefined;
}

function paymentMethodId(paymentIntent: Stripe.PaymentIntent) {
	const method = paymentIntent.payment_method;
	if (!method) return undefined;
	return typeof method === 'string' ? method : method.id;
}

function customerId(paymentIntent: Stripe.PaymentIntent) {
	const customer = paymentIntent.customer;
	if (!customer) return undefined;
	return typeof customer === 'string' ? customer : customer.id;
}

function captureMethodFromIntent(paymentIntent: Stripe.PaymentIntent) {
	return paymentIntent.capture_method === 'manual' ? 'manual' : 'automatic';
}

function currentTimestampFields(status: PaymentAttemptStatus, now: Date) {
	if (status === 'captured') return { capturedAt: now };
	if (status === 'authorized') return { authorizedAt: now };
	if (status === 'failed') return { failedAt: now };
	if (status === 'cancelled' || status === 'expired') return { cancelledAt: now };
	return {};
}

function getPaymentHoldStatus(status: PaymentAttemptStatus) {
	if (status === 'authorized') return 'authorized';
	if (status === 'captured') return 'captured';
	if (status === 'failed') return 'failed';
	if (status === 'cancelled') return 'cancelled';
	if (status === 'expired') return 'expired';
	return 'pending';
}

function ensureStripeConfigured(stripe: Stripe | null): Stripe {
	if (!stripe) {
		throw new PaymentDomainError(
			'Stripe is not configured on the server.',
			500,
			'stripe_not_configured'
		);
	}
	return stripe;
}

export function isStandalonePaper(paper: any): boolean {
	return !hasHubPublication(paper);
}

export function paymentPurposeForPolicy(input: {
	isStandalone: boolean;
	policy: PaperPaymentPolicy;
}): PaymentAttemptPurpose {
	if (input.isStandalone) return STANDALONE_SUBMISSION_PURPOSE;
	if (input.policy === 'submission') return 'hub_submission';
	if (input.policy === 'review') return 'hub_review';
	return 'hub_publication';
}

export async function resolvePaperPaymentPolicy(
	paper: any,
	options: QueryOptions = {}
): Promise<{
	isStandalone: boolean;
	hubId: string | null;
	hub: any | null;
	policy: PaperPaymentPolicy;
	purpose: PaymentAttemptPurpose;
	policyVersion: string;
}> {
	const standalone = isStandalonePaper(paper);
	if (standalone) {
		return {
			isStandalone: true,
			hubId: null,
			hub: null,
			policy: 'submission',
			purpose: STANDALONE_SUBMISSION_PURPOSE,
			policyVersion: PLATFORM_PAYMENT_POLICY_VERSION
		};
	}

	const populatedHub = typeof paper?.hubId === 'object' ? paper.hubId : paper?.hub;
	const hubId = getHubIdFromPaper(paper);
	let hub = populatedHub && typeof populatedHub === 'object' ? populatedHub : null;

	if (!hub && hubId) {
		hub = await maybeSession(
			Hubs.findOne({ $or: [{ id: hubId }, { _id: hubId }] }),
			options.session
		).lean();
	}

	const configuredPolicy = hub?.billing?.paperPaymentPolicy;
	const policy = isValidPaperPaymentPolicy(configuredPolicy)
		? configuredPolicy
		: DEFAULT_HUB_PAYMENT_POLICY;
	const policyVersion = String(hub?.billing?.policyVersion || 'hub-billing-v1');

	return {
		isStandalone: false,
		hubId,
		hub,
		policy,
		purpose: paymentPurposeForPolicy({ isStandalone: false, policy }),
		policyVersion: hubId ? `hub:${hubId}:${policyVersion}:${policy}` : `${policyVersion}:${policy}`
	};
}

export function mapStripePaymentIntentStatus(
	paymentIntent: Stripe.PaymentIntent
): PaymentAttemptStatus {
	if (paymentIntent.status === 'succeeded') return 'captured';
	if (paymentIntent.status === 'requires_capture') return 'authorized';
	if (paymentIntent.status === 'processing') return 'processing';
	if (paymentIntent.status === 'requires_action') return 'requires_action';
	if (paymentIntent.status === 'canceled') return 'cancelled';
	if (paymentIntent.status === 'requires_payment_method') {
		return paymentIntent.last_payment_error ? 'failed' : 'pending';
	}
	return 'processing';
}

export function resolvePaperPaymentState(paper: any, attempt: any | null): PaperPaymentState {
	if (!paper) return 'not_required';
	if (!attempt) return 'unpaid';
	if (attempt.status === 'captured') return 'captured';
	if (attempt.status === 'authorized') return 'authorized';
	if (attempt.status === 'requires_action') return 'requires_action';
	if (attempt.status === 'processing' || attempt.status === 'pending') return 'processing';
	if (stateRequiresRetry(attempt.status)) return 'retry_required';
	return 'required';
}

export function assertUserCanManagePaperPayment(user: any, paper: any) {
	const userId = normalizeId(user);
	if (!userId || !getPaperAuthorAliases(paper).includes(userId)) {
		throw new PaymentDomainError(
			'You cannot manage payment for this paper.',
			403,
			'paper_payment_forbidden'
		);
	}
}

export function assertUserCanManageStandalonePaperPayment(user: any, paper: any) {
	if (!isStandalonePaper(paper)) {
		throw new PaymentDomainError(
			'This payment operation is only valid for standalone papers.',
			400,
			'not_standalone_paper'
		);
	}
	assertUserCanManagePaperPayment(user, paper);
}

function actionRequiresPayment(
	action: string | undefined,
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>
) {
	if (!action) return true;
	if (action === 'paper.submit') return resolved.isStandalone || resolved.policy === 'submission';
	if (action === 'paper.sendToReview') {
		return resolved.isStandalone || resolved.policy === 'submission' || resolved.policy === 'review';
	}
	if (action === 'paper.publish' || action === 'paper.publishStandalone') return true;
	return false;
}

function reviewerInvitationRequiresPayment(
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>
) {
	return resolved.isStandalone || resolved.policy === 'submission' || resolved.policy === 'review';
}

function assertPaperStatusAllowsPayment(
	paper: any,
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>
) {
	const status = String(paper?.status ?? '');
	if (resolved.purpose === 'standalone_submission' || resolved.purpose === 'hub_submission') {
		if (status !== 'draft') {
			throw new PaymentDomainError(
				'Submission payment can only be started while the paper is a draft.',
				409,
				'payment_not_available_for_status',
				{ status, purpose: resolved.purpose }
			);
		}
		return;
	}

	if (resolved.purpose === 'hub_review') {
		if (status !== 'reviewer assignment') {
			throw new PaymentDomainError(
				'Review payment can only be started after submission and before review begins.',
				409,
				'payment_not_available_for_status',
				{ status, purpose: resolved.purpose }
			);
		}
		return;
	}

	const publicationPaymentStatuses = new Set([
		'reviewer assignment',
		'awaiting final decision',
		'accepted',
		'needing corrections',
		'under correction'
	]);
	if (!publicationPaymentStatuses.has(status)) {
		throw new PaymentDomainError(
			'Publication payment can only be started after editorial finalization and before publication.',
			409,
			'payment_not_available_for_status',
			{ status, purpose: resolved.purpose }
		);
	}
}

function hasMatchingPaymentPolicyAcceptance(
	paper: any,
	user: any,
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>
) {
	const acceptance = paper?.paymentPolicyAcceptance;
	if (!acceptance?.acceptedAt) return false;
	if (normalizeId(acceptance.userId) !== normalizeId(user)) return false;
	return String(acceptance.policyVersion ?? '') === resolved.policyVersion;
}

async function persistPaymentPolicyAcceptance(
	paper: any,
	user: any,
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>,
	options: QueryOptions = {}
) {
	const acceptedAt = new Date();
	const paperId = normalizeId(paper?.id) || normalizeId(paper?._id);
	const acceptance = {
		policyVersion: resolved.policyVersion,
		acceptedAt,
		userId: normalizeId(user),
		paperId,
		hubId: resolved.hubId
	};
	await maybeSession(
		Papers.updateOne(paperLookup(paperId), { $set: { paymentPolicyAcceptance: acceptance } }),
		options.session
	);
	paper.paymentPolicyAcceptance = acceptance;
}

async function assertPaymentPolicyAcceptedForCharge(input: {
	paper: any;
	user: any;
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>;
	acceptPaymentPolicy?: boolean;
	options?: QueryOptions;
}) {
	if (hasMatchingPaymentPolicyAcceptance(input.paper, input.user, input.resolved)) return;
	if (!input.acceptPaymentPolicy) {
		throw new PaymentDomainError(
			'Payment policy acceptance is required before creating a paper payment.',
			400,
			'payment_policy_acceptance_required',
			{ policyVersion: input.resolved.policyVersion }
		);
	}
	await persistPaymentPolicyAcceptance(input.paper, input.user, input.resolved, input.options);
}

async function loadPaperById(paperId: string, options: QueryOptions = {}) {
	const paper = await maybeSession(Papers.findOne(paperLookup(paperId)), options.session);
	if (!paper) throw new PaymentDomainError('Paper not found.', 404, 'paper_not_found');
	return paper;
}

async function findCurrentAttemptForPaper(
	paperId: string,
	purpose: PaymentAttemptPurpose,
	options: QueryOptions = {}
) {
	return maybeSession(
		PaymentAttempts.findOne({ paperId, purpose, isCurrent: true }).sort({ createdAt: -1 }),
		options.session
	);
}

async function findLatestAttemptForPaper(
	paperId: string,
	purpose: PaymentAttemptPurpose,
	options: QueryOptions = {}
) {
	return maybeSession(
		PaymentAttempts.findOne({ paperId, purpose }).sort({ createdAt: -1 }),
		options.session
	);
}

async function findLatestCapturedAttemptForPaper(
	paperId: string,
	purpose: PaymentAttemptPurpose,
	options: QueryOptions = {}
) {
	return maybeSession(
		PaymentAttempts.findOne({ paperId, purpose, status: 'captured' }).sort({
			capturedAt: -1,
			createdAt: -1
		}),
		options.session
	);
}

async function markOtherAttemptsNotCurrent(input: {
	paperId: string;
	purpose: PaymentAttemptPurpose;
	exceptAttemptId?: string;
}) {
	await PaymentAttempts.updateMany(
		{
			paperId: input.paperId,
			purpose: input.purpose,
			...(input.exceptAttemptId ? { id: { $ne: input.exceptAttemptId } } : {})
		},
		{ $set: { isCurrent: false } }
	);
}

async function syncAttemptFromPaymentIntent(input: {
	attempt: any;
	paymentIntent: Stripe.PaymentIntent;
	stripeEventId?: string;
	eventType?: string;
}) {
	const { attempt, paymentIntent, stripeEventId, eventType } = input;
	const now = new Date();
	const nextStatus = mapStripePaymentIntentStatus(paymentIntent);
	const previousStatus = attempt.status;
	const nextReceiptUrl = chargeReceiptUrl(paymentIntent);
	const nextFailureReason = paymentIntent.last_payment_error?.message;
	const captureMethod = captureMethodFromIntent(paymentIntent);
	const nextPaymentMethodId = paymentMethodId(paymentIntent);
	const nextCustomerId = customerId(paymentIntent);

	attempt.providerStatus = paymentIntent.status;
	attempt.status = nextStatus;
	attempt.amountCents = paymentIntent.amount;
	attempt.currency = paymentIntent.currency;
	attempt.captureMethod = captureMethod;
	attempt.failureReason = nextFailureReason ?? attempt.failureReason;
	attempt.receiptUrl = nextReceiptUrl ?? attempt.receiptUrl;
	attempt.providerPaymentMethodId = nextPaymentMethodId ?? attempt.providerPaymentMethodId;
	attempt.providerCustomerId = nextCustomerId ?? attempt.providerCustomerId;
	attempt.updatedAt = now;
	Object.assign(attempt, currentTimestampFields(nextStatus, now));

	if (nextStatus === 'authorized' && !attempt.authorizationExpiresAt) {
		attempt.authorizationExpiresAt = attempt.expiresAt;
	}
	if (stripeEventId && !attempt.stripeEventIds?.includes(stripeEventId)) {
		attempt.stripeEventIds = [...(attempt.stripeEventIds ?? []), stripeEventId];
	}
	if (previousStatus !== nextStatus || stripeEventId) {
		attempt.statusHistory = [
			...(attempt.statusHistory ?? []),
			{
				status: nextStatus,
				providerStatus: paymentIntent.status,
				message: eventType,
				stripeEventId,
				createdAt: now
			}
		];
	}

	if (nextStatus === 'captured') {
		attempt.isCurrent = true;
		await markOtherAttemptsNotCurrent({
			paperId: attempt.paperId,
			purpose: attempt.purpose,
			exceptAttemptId: attempt.id
		});
	}

	await attempt.save();

	await Papers.updateOne(paperLookup(String(attempt.paperId)), {
		$set: {
			paymentHold: {
				stripePaymentIntentId: paymentIntent.id,
				purpose: attempt.purpose,
				paymentMethodId: attempt.providerPaymentMethodId,
				customerId: attempt.providerCustomerId,
				captureMethod,
				status: getPaymentHoldStatus(nextStatus),
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				authorizedAt: attempt.authorizedAt,
				capturedAt: attempt.capturedAt,
				releasedAt: nextStatus === 'cancelled' ? now : undefined,
				authorizationExpiresAt: attempt.authorizationExpiresAt ?? attempt.expiresAt,
				renewalCount: attempt.renewalCount ?? 0,
				failureReason: attempt.failureReason,
				receiptUrl: attempt.receiptUrl
			}
		}
	});

	return attempt;
}

export async function getPaperPaymentRequirement(
	paper: any,
	options: QueryOptions & { action?: string } = {}
) {
	const resolved = await resolvePaperPaymentPolicy(paper, options);
	const amount = getPaperPaymentConfig(resolved.purpose);
	const paperId = normalizeId(paper?.id) || normalizeId(paper?._id);
	const attempt =
		(await findLatestCapturedAttemptForPaper(paperId, resolved.purpose, options)) ??
		(await findLatestAttemptForPaper(paperId, resolved.purpose, options));
	const state = resolvePaperPaymentState(paper, attempt);
	const required = actionRequiresPayment(options.action, resolved);

	return {
		required,
		policy: resolved.policy,
		purpose: resolved.purpose,
		policyVersion: resolved.policyVersion,
		hubId: resolved.hubId,
		amountCents: amount.amountCents,
		currency: amount.currency,
		state,
		attempt
	};
}

export async function getStandaloneSubmissionPaymentRequirement(
	paper: any,
	options: QueryOptions = {}
) {
	if (!isStandalonePaper(paper)) {
		return {
			required: false,
			state: 'not_required' as PaperPaymentState,
			attempt: null,
			...getStandaloneSubmissionPaymentConfig()
		};
	}
	return getPaperPaymentRequirement(paper, options);
}

export async function getPaperPaymentGate(
	paper: any,
	options: QueryOptions & { action?: string; reviewerInvitation?: boolean } = {}
) {
	const resolved = await resolvePaperPaymentPolicy(paper, options);
	const amount = getPaperPaymentConfig(resolved.purpose);
	const paperId = normalizeId(paper?.id) || normalizeId(paper?._id);
	const attempt =
		(await findLatestCapturedAttemptForPaper(paperId, resolved.purpose, options)) ??
		(await findLatestAttemptForPaper(paperId, resolved.purpose, options));
	const state = resolvePaperPaymentState(paper, attempt);
	const required = options.reviewerInvitation
		? reviewerInvitationRequiresPayment(resolved)
		: actionRequiresPayment(options.action, resolved);

	return {
		required,
		allowed: !required || state === 'captured',
		state: required ? state : ('not_required' as PaperPaymentState),
		policy: resolved.policy,
		purpose: resolved.purpose,
		policyVersion: resolved.policyVersion,
		hubId: resolved.hubId,
		amountCents: amount.amountCents,
		currency: amount.currency,
		attempt
	};
}

export async function getStandaloneSubmissionPaymentGate(
	paper: any,
	options: QueryOptions = {}
) {
	if (!isStandalonePaper(paper)) {
		return {
			required: false,
			allowed: true,
			state: 'not_required' as PaperPaymentState,
			attempt: null,
			...getStandaloneSubmissionPaymentConfig()
		};
	}
	return getPaperPaymentGate(paper, options);
}

export async function getReviewerInvitationPaymentGate(paper: any, options: QueryOptions = {}) {
	return getPaperPaymentGate(paper, { ...options, reviewerInvitation: true });
}

export async function loadPaperPaymentState(paperId: string, user: any) {
	await start_mongo();
	const paper = await loadPaperById(paperId);
	assertUserCanManagePaperPayment(user, paper);
	return getPaperPaymentRequirement(paper);
}

export async function loadStandalonePaperPaymentState(paperId: string, user: any) {
	const state = await loadPaperPaymentState(paperId, user);
	if (state.purpose !== STANDALONE_SUBMISSION_PURPOSE) {
		return { ...state, required: false, state: 'not_required' as PaperPaymentState };
	}
	return state;
}

export async function createPaperPaymentIntent(input: {
	paperId: string;
	user: any;
	acceptPaymentPolicy?: boolean;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManagePaperPayment(input.user, paper);
	const resolved = await resolvePaperPaymentPolicy(paper);
	const paperId = normalizeId(paper.id) || normalizeId(paper._id);

	const capturedAttempt = await findLatestCapturedAttemptForPaper(paperId, resolved.purpose);
	if (capturedAttempt) {
		return {
			alreadyPaid: true,
			paymentIntentId: capturedAttempt.providerPaymentIntentId,
			clientSecret: null,
			amountCents: capturedAttempt.amountCents,
			currency: capturedAttempt.currency,
			status: capturedAttempt.providerStatus ?? capturedAttempt.status,
			paymentState: 'captured' as PaperPaymentState,
			attempt: capturedAttempt,
			policy: resolved.policy,
			purpose: resolved.purpose,
			policyVersion: resolved.policyVersion
		};
	}

	assertPaperStatusAllowsPayment(paper, resolved);
	await assertPaymentPolicyAcceptedForCharge({
		paper,
		user: input.user,
		resolved,
		acceptPaymentPolicy: input.acceptPaymentPolicy
	});

	const stripe = ensureStripeConfigured(getStripeClient());
	const amount = getPaperPaymentConfig(resolved.purpose);
	const attemptId = crypto.randomUUID();
	await markOtherAttemptsNotCurrent({ paperId, purpose: resolved.purpose });

	const paymentIntent = await stripe.paymentIntents.create({
		amount: amount.amountCents,
		currency: amount.currency,
		automatic_payment_methods: { enabled: true },
		metadata: {
			paperId,
			userId: normalizeId(input.user),
			hubId: resolved.hubId ?? '',
			purpose: resolved.purpose,
			paymentPolicy: resolved.policy,
			policyVersion: resolved.policyVersion,
			paymentAttemptId: attemptId
		}
	});

	const attempt = new PaymentAttempts({
		_id: attemptId,
		id: attemptId,
		paperId,
		userId: normalizeId(input.user),
		hubId: resolved.hubId,
		purpose: resolved.purpose,
		provider: 'stripe',
		providerPaymentIntentId: paymentIntent.id,
		providerStatus: paymentIntent.status,
		captureMethod: captureMethodFromIntent(paymentIntent),
		amountCents: paymentIntent.amount,
		currency: paymentIntent.currency,
		status: mapStripePaymentIntentStatus(paymentIntent),
		isCurrent: true,
		metadata: {
			paymentPolicy: resolved.policy,
			policyVersion: resolved.policyVersion
		},
		statusHistory: [
			{
				status: mapStripePaymentIntentStatus(paymentIntent),
				providerStatus: paymentIntent.status,
				message: 'PaymentIntent created.',
				createdAt: new Date()
			}
		],
		createdAt: new Date(),
		updatedAt: new Date()
	});
	await attempt.save();
	await syncAttemptFromPaymentIntent({ attempt, paymentIntent });

	return {
		alreadyPaid: false,
		paymentIntentId: paymentIntent.id,
		clientSecret: paymentIntent.client_secret,
		amountCents: paymentIntent.amount,
		currency: paymentIntent.currency,
		status: paymentIntent.status,
		paymentState: resolvePaperPaymentState(paper, attempt),
		attempt,
		policy: resolved.policy,
		purpose: resolved.purpose,
		policyVersion: resolved.policyVersion
	};
}

export async function createStandaloneSubmissionPaymentIntent(input: {
	paperId: string;
	user: any;
	acceptPaymentPolicy?: boolean;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManageStandalonePaperPayment(input.user, paper);
	return createPaperPaymentIntent(input);
}

async function getAttemptForPaymentIntent(input: {
	paper: any;
	user: any;
	paymentIntentId?: string;
	resolved: Awaited<ReturnType<typeof resolvePaperPaymentPolicy>>;
}) {
	const paperId = normalizeId(input.paper.id) || normalizeId(input.paper._id);
	if (input.paymentIntentId) {
		const attempt = await PaymentAttempts.findOne({
			provider: 'stripe',
			providerPaymentIntentId: input.paymentIntentId
		});
		if (!attempt) {
			throw new PaymentDomainError(
				'PaymentIntent was not created by SciLedger.',
				404,
				'payment_attempt_not_found'
			);
		}
		if (String(attempt.paperId) !== paperId || String(attempt.purpose) !== input.resolved.purpose) {
			throw new PaymentDomainError(
				'PaymentIntent does not match the current paper payment.',
				403,
				'payment_intent_mismatch'
			);
		}
		if (String(attempt.userId) !== normalizeId(input.user)) {
			throw new PaymentDomainError(
				'PaymentIntent belongs to another user.',
				403,
				'payment_intent_owner_mismatch'
			);
		}
		return attempt;
	}

	const attempt = await findCurrentAttemptForPaper(paperId, input.resolved.purpose);
	if (!attempt) {
		throw new PaymentDomainError(
			'No current payment attempt found for this paper.',
			404,
			'payment_attempt_not_found'
		);
	}
	return attempt;
}

export async function reconcilePaperPayment(input: {
	paperId: string;
	user: any;
	paymentIntentId?: string;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManagePaperPayment(input.user, paper);
	const resolved = await resolvePaperPaymentPolicy(paper);
	const attempt = await getAttemptForPaymentIntent({
		paper,
		user: input.user,
		paymentIntentId: input.paymentIntentId,
		resolved
	});
	const stripe = ensureStripeConfigured(getStripeClient());
	const paymentIntent = await stripe.paymentIntents.retrieve(String(attempt.providerPaymentIntentId), {
		expand: ['latest_charge']
	});
	const syncedAttempt = await syncAttemptFromPaymentIntent({ attempt, paymentIntent });
	return {
		paymentIntent,
		attempt: syncedAttempt,
		paymentState: resolvePaperPaymentState(paper, syncedAttempt),
		policy: resolved.policy,
		purpose: resolved.purpose
	};
}

export async function reconcileStandaloneSubmissionPayment(input: {
	paperId: string;
	user: any;
	paymentIntentId?: string;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManageStandalonePaperPayment(input.user, paper);
	return reconcilePaperPayment(input);
}

export async function confirmPaperPayment(input: {
	paperId: string;
	user: any;
	paymentIntentId?: string;
	paymentMethodId?: string;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManagePaperPayment(input.user, paper);
	const resolved = await resolvePaperPaymentPolicy(paper);
	const attempt = await getAttemptForPaymentIntent({
		paper,
		user: input.user,
		paymentIntentId: input.paymentIntentId,
		resolved
	});
	const stripe = ensureStripeConfigured(getStripeClient());
	let paymentIntent = await stripe.paymentIntents.retrieve(String(attempt.providerPaymentIntentId), {
		expand: ['latest_charge']
	});

	if (
		input.paymentMethodId &&
		(paymentIntent.status === 'requires_payment_method' ||
			paymentIntent.status === 'requires_confirmation')
	) {
		paymentIntent = await stripe.paymentIntents.confirm(
			String(attempt.providerPaymentIntentId),
			{ payment_method: input.paymentMethodId },
			{ idempotencyKey: `paper-payment-confirm:${attempt.id}:${input.paymentMethodId}` }
		);
	}

	const syncedAttempt = await syncAttemptFromPaymentIntent({ attempt, paymentIntent });
	return {
		paymentIntent,
		attempt: syncedAttempt,
		paymentState: resolvePaperPaymentState(paper, syncedAttempt),
		policy: resolved.policy,
		purpose: resolved.purpose
	};
}

export async function confirmStandaloneSubmissionPayment(input: {
	paperId: string;
	user: any;
	paymentIntentId?: string;
	paymentMethodId?: string;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManageStandalonePaperPayment(input.user, paper);
	return confirmPaperPayment(input);
}

export async function capturePaperPayment(input: { paperId: string; user: any }) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManagePaperPayment(input.user, paper);
	const resolved = await resolvePaperPaymentPolicy(paper);
	const paperId = normalizeId(paper.id) || normalizeId(paper._id);
	const attempt = await findCurrentAttemptForPaper(paperId, resolved.purpose);
	if (!attempt) {
		throw new PaymentDomainError(
			'No current payment attempt found for this paper.',
			404,
			'payment_attempt_not_found'
		);
	}
	if (attempt.status !== 'authorized') {
		throw new PaymentDomainError(
			'Only authorized manual payments can be captured.',
			409,
			'payment_not_authorized'
		);
	}

	const stripe = ensureStripeConfigured(getStripeClient());
	const paymentIntent = await stripe.paymentIntents.capture(
		String(attempt.providerPaymentIntentId),
		undefined,
		{ idempotencyKey: `paper-payment-capture:${attempt.id}` }
	);
	const syncedAttempt = await syncAttemptFromPaymentIntent({ attempt, paymentIntent });
	return {
		paymentIntent,
		attempt: syncedAttempt,
		paymentState: resolvePaperPaymentState(paper, syncedAttempt),
		policy: resolved.policy,
		purpose: resolved.purpose
	};
}

export async function captureStandaloneSubmissionPayment(input: { paperId: string; user: any }) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManageStandalonePaperPayment(input.user, paper);
	return capturePaperPayment(input);
}

export async function cancelPaperPayment(input: { paperId: string; user: any; reason?: string }) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManagePaperPayment(input.user, paper);
	const resolved = await resolvePaperPaymentPolicy(paper);
	const paperId = normalizeId(paper.id) || normalizeId(paper._id);
	const attempt = await findCurrentAttemptForPaper(paperId, resolved.purpose);
	if (!attempt) {
		throw new PaymentDomainError(
			'No current payment attempt found for this paper.',
			404,
			'payment_attempt_not_found'
		);
	}
	if (!attempt.providerPaymentIntentId) {
		throw new PaymentDomainError(
			'Payment attempt does not have a PaymentIntent.',
			409,
			'payment_intent_missing'
		);
	}

	const stripe = ensureStripeConfigured(getStripeClient());
	const paymentIntent = await stripe.paymentIntents.cancel(
		String(attempt.providerPaymentIntentId),
		input.reason ? { cancellation_reason: 'requested_by_customer' } : undefined,
		{ idempotencyKey: `paper-payment-cancel:${attempt.id}` }
	);
	attempt.failureReason = input.reason ?? attempt.failureReason;
	const syncedAttempt = await syncAttemptFromPaymentIntent({ attempt, paymentIntent });
	return {
		paymentIntent,
		attempt: syncedAttempt,
		paymentState: resolvePaperPaymentState(paper, syncedAttempt),
		policy: resolved.policy,
		purpose: resolved.purpose
	};
}

export async function cancelStandaloneSubmissionPayment(input: {
	paperId: string;
	user: any;
	reason?: string;
}) {
	await start_mongo();
	const paper = await loadPaperById(input.paperId);
	assertUserCanManageStandalonePaperPayment(input.user, paper);
	return cancelPaperPayment(input);
}

export async function recordStripePaymentIntentWebhook(input: {
	paymentIntent: Stripe.PaymentIntent;
	stripeEventId: string;
	eventType: string;
}) {
	await start_mongo();
	const attempt = await PaymentAttempts.findOne({
		provider: 'stripe',
		providerPaymentIntentId: input.paymentIntent.id
	});
	if (!attempt) return { processed: false, reason: 'attempt_not_found' };
	if (attempt.stripeEventIds?.includes(input.stripeEventId)) {
		return { processed: false, reason: 'duplicate_event', attempt };
	}

	const syncedAttempt = await syncAttemptFromPaymentIntent({
		attempt,
		paymentIntent: input.paymentIntent,
		stripeEventId: input.stripeEventId,
		eventType: input.eventType
	});
	return { processed: true, attempt: syncedAttempt };
}

export async function recordStripeChargeRefundedWebhook(input: {
	charge: Stripe.Charge;
	stripeEventId: string;
}) {
	await start_mongo();
	const paymentIntentId =
		typeof input.charge.payment_intent === 'string'
			? input.charge.payment_intent
			: input.charge.payment_intent?.id;
	if (!paymentIntentId) return { processed: false, reason: 'payment_intent_missing' };

	const attempt = await PaymentAttempts.findOne({
		provider: 'stripe',
		providerPaymentIntentId: paymentIntentId
	});
	if (!attempt) return { processed: false, reason: 'attempt_not_found' };
	if (attempt.stripeEventIds?.includes(input.stripeEventId)) {
		return { processed: false, reason: 'duplicate_event', attempt };
	}

	attempt.stripeEventIds = [...(attempt.stripeEventIds ?? []), input.stripeEventId];
	attempt.metadata = {
		...(attempt.metadata ?? {}),
		lastRefund: {
			chargeId: input.charge.id,
			amountRefunded: input.charge.amount_refunded,
			refunded: input.charge.refunded,
			recordedAt: new Date().toISOString()
		}
	};
	attempt.statusHistory = [
		...(attempt.statusHistory ?? []),
		{
			status: attempt.status,
			providerStatus: 'charge.refunded',
			message: 'Stripe charge refund recorded.',
			stripeEventId: input.stripeEventId,
			createdAt: new Date()
		}
	];
	attempt.updatedAt = new Date();
	await attempt.save();
	return { processed: true, attempt };
}
