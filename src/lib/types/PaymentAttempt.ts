export type PaperPaymentPolicy = 'submission' | 'review' | 'publication';

export type PaymentAttemptPurpose =
	| 'standalone_submission'
	| 'hub_submission'
	| 'hub_review'
	| 'hub_publication';

export type PaymentAttemptProvider = 'stripe';

export type PaymentAttemptCaptureMethod = 'automatic' | 'manual';

export type PaymentAttemptStatus =
	| 'pending'
	| 'processing'
	| 'requires_action'
	| 'authorized'
	| 'captured'
	| 'failed'
	| 'cancelled'
	| 'expired';

export type PaymentAttempt = {
	_id: string;
	id: string;
	paperId: string;
	userId: string;
	hubId?: string | null;
	purpose: PaymentAttemptPurpose;
	provider: PaymentAttemptProvider;
	providerPaymentIntentId?: string;
	providerPaymentMethodId?: string;
	providerCustomerId?: string;
	providerStatus?: string;
	captureMethod?: PaymentAttemptCaptureMethod;
	amountCents: number;
	currency: string;
	status: PaymentAttemptStatus;
	isCurrent: boolean;
	failureReason?: string;
	receiptUrl?: string;
	stripeEventIds?: string[];
	metadata?: Record<string, unknown>;
	paymentMethodSaved?: boolean;
	authorizationDurationDays?: number;
	renewalBeforeExpirationDays?: number;
	authorizationExpiresAt?: Date;
	renewalCount?: number;
	renewedFromAttemptId?: string;
	renewalStoppedAt?: Date;
	renewalStoppedReason?: string;
	statusHistory?: Array<{
		status: PaymentAttemptStatus;
		providerStatus?: string;
		message?: string;
		stripeEventId?: string;
		createdAt?: Date;
	}>;
	createdAt: Date;
	updatedAt: Date;
	authorizedAt?: Date;
	capturedAt?: Date;
	failedAt?: Date;
	cancelledAt?: Date;
	expiresAt?: Date;
};
