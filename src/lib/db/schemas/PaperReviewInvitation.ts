import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const PaperReviewInvitationSchema: Schema = new Schema(
	{
		_id: { type: String, required: true },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		paperId: { type: String, ref: 'Paper', required: true },
		paper: { type: String, ref: 'Paper', required: true },
		reviewerId: { type: String, ref: 'User', required: true },
		reviewer: { type: String, ref: 'User', required: true },
		invitedBy: { type: Schema.Types.Mixed, required: true },
		hubId: { type: String, ref: 'Hub', default: null },
		status: {
			type: String,
			enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled', 'duplicate'],
			default: 'pending',
			required: true
		},
		duplicateOf: { type: String, ref: 'PaperReviewInvitation', default: null },
		customDeadlineDays: { type: Number, default: 15 },
		reviewAssignmentId: { type: String, ref: 'ReviewAssignment' },
		invitedAt: { type: Date, default: Date.now, required: true },
		expiresAt: {
			type: Date,
			default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
		},
		respondedAt: { type: Date },
		expiredAt: { type: Date },
		cancelledAt: { type: Date },
		resendCount: { type: Number, default: 0 },
		parentInvitationId: { type: String, ref: 'PaperReviewInvitation', default: null },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now }
	},
	{ collection: 'paperreviewinvitations' }
);

PaperReviewInvitationSchema.index({ paper: 1, reviewer: 1 });
PaperReviewInvitationSchema.index({ paperId: 1, reviewerId: 1, status: 1 });
PaperReviewInvitationSchema.index({ reviewer: 1, status: 1 });
PaperReviewInvitationSchema.index({ reviewerId: 1, status: 1 });
PaperReviewInvitationSchema.index({ hubId: 1 });
PaperReviewInvitationSchema.index({ status: 1, expiresAt: 1 });
PaperReviewInvitationSchema.index({ parentInvitationId: 1 });
PaperReviewInvitationSchema.index(
	{ paperId: 1, reviewerId: 1 },
	{
		unique: true,
		partialFilterExpression: { status: 'pending' },
		name: 'unique_pending_paper_review_invitation'
	}
);
