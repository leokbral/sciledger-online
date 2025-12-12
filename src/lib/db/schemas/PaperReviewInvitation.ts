import { Schema } from 'mongoose';

export const PaperReviewInvitationSchema: Schema = new Schema(
	{
		_id: { type: String, required: true },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		paper: { type: String, ref: 'Paper', required: true },
		reviewer: { type: String, ref: 'User', required: true },
		invitedBy: { type: String, ref: 'User', required: true },
		hubId: { type: String, ref: 'Hub', required: true },
		status: {
			type: String,
			enum: ['pending', 'accepted', 'declined'],
			default: 'pending',
			required: true
		},
		invitedAt: { type: Date, default: Date.now, required: true },
		respondedAt: { type: Date },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now }
	},
	{ collection: 'paperreviewinvitations' }
);

// Index para queries frequentes
PaperReviewInvitationSchema.index({ paper: 1, reviewer: 1 });
PaperReviewInvitationSchema.index({ reviewer: 1, status: 1 });
PaperReviewInvitationSchema.index({ hubId: 1 });
