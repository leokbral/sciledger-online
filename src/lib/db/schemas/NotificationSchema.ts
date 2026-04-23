import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const NotificationSchema: Schema = new Schema(
	{
		_id: { type: String, required: true },
		id: { type: String, default: () => crypto.randomUUID(), unique: true },
		user: { type: String, required: true, ref: 'User' },
		type: {
			type: String,
			enum: [
				'invitation',
				'comment',
				'connection_request',
				'paper_accepted',
				'paper_rejected',
				'paper_pending_review',
				'paper_submitted',
				'hub_invitation',
				'review_request',
				'review_completed',
				'system',
				'follow',
				'mention',
				'paper_published',
				'hub_paper_pending',
				'standalone_paper_pending',
				'paper_accepted_for_review',
				'reviewer_assigned',
				'reviewer_accepted_review',
				'reviewer_declined_review',
				'review_submitted',
				'corrections_submitted',
				'paper_final_acceptance',
				'paper_final_rejection',
				'hub_reviewer_accepted',
				'hub_reviewer_declined',
				'invitation_cancelled'
			],
			required: true
		},
		title: { type: String, required: true },
		content: { type: String, required: true },
		relatedUser: { type: String, ref: 'User' },
		relatedPaperId: { type: String },
		relatedCommentId: { type: String },
		relatedHubId: { type: String },
		relatedReviewId: { type: String },
		actionUrl: { type: String }, // URL to redirect the user to
		metadata: { type: Schema.Types.Mixed }, // Additional type-specific data
		isRead: {
			type: Boolean,
			default: false
		},
		priority: {
			type: String,
			enum: ['low', 'medium', 'high', 'urgent'],
			default: 'medium'
		},
		expiresAt: { type: Date }, // For temporary notifications
		createdAt: { type: Date, default: Date.now },
		readAt: { type: Date }
	},
	{
		collection: 'notifications',
		timestamps: true
	}
);

// Indexes for performance
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
