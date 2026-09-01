import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const PaymentAttemptSchema: Schema = new Schema(
	{
		_id: { type: String, required: true },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		paperId: { type: String, required: true, index: true },
		userId: { type: String, required: true, index: true },
		hubId: { type: String, index: true, sparse: true },
		purpose: {
			type: String,
			required: true,
			enum: ['standalone_submission', 'hub_submission', 'hub_review', 'hub_publication'],
			index: true
		},
		provider: {
			type: String,
			required: true,
			enum: ['stripe'],
			default: 'stripe'
		},
		providerPaymentIntentId: { type: String, index: true, sparse: true },
		providerPaymentMethodId: { type: String },
		providerCustomerId: { type: String },
		providerStatus: { type: String },
		captureMethod: {
			type: String,
			enum: ['automatic', 'manual'],
			default: 'automatic',
			index: true
		},
		amountCents: { type: Number, required: true, min: 0 },
		currency: { type: String, required: true, lowercase: true, trim: true },
		status: {
			type: String,
			required: true,
			enum: [
				'pending',
				'processing',
				'requires_action',
				'authorized',
				'captured',
				'failed',
				'cancelled',
				'expired'
			],
			default: 'pending',
			index: true
		},
		isCurrent: { type: Boolean, default: true, index: true },
		failureReason: { type: String },
		receiptUrl: { type: String },
		stripeEventIds: [{ type: String }],
		metadata: { type: Schema.Types.Mixed, default: {} },
		paymentMethodSaved: { type: Boolean, default: false },
		authorizationDurationDays: { type: Number },
		renewalBeforeExpirationDays: { type: Number },
		authorizationExpiresAt: { type: Date },
		renewalCount: { type: Number, default: 0 },
		renewedFromAttemptId: { type: String },
		renewalStoppedAt: { type: Date },
		renewalStoppedReason: { type: String },
		statusHistory: [
			{
				_id: false,
				status: {
					type: String,
					required: true,
					enum: [
						'pending',
						'processing',
						'requires_action',
						'authorized',
						'captured',
						'failed',
						'cancelled',
						'expired'
					]
				},
				providerStatus: { type: String },
				message: { type: String },
				stripeEventId: { type: String },
				createdAt: { type: Date, default: () => new Date() }
			}
		],
		authorizedAt: { type: Date },
		capturedAt: { type: Date },
		failedAt: { type: Date },
		cancelledAt: { type: Date },
		expiresAt: { type: Date }
	},
	{ collection: 'payment_attempts', timestamps: true }
);

PaymentAttemptSchema.index({ paperId: 1, purpose: 1, isCurrent: 1, createdAt: -1 });
PaymentAttemptSchema.index({ provider: 1, providerPaymentIntentId: 1 }, { sparse: true });
PaymentAttemptSchema.index({ userId: 1, status: 1, updatedAt: -1 });
PaymentAttemptSchema.index({ hubId: 1, purpose: 1, status: 1 }, { sparse: true });
