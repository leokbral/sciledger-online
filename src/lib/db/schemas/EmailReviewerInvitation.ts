import { Schema } from 'mongoose';

export const EmailReviewerInvitationSchema: Schema = new Schema({
    email: { type: String, required: true },
    hubId: { type: String, required: true, ref: 'Hub' },
    paperId: { type: String, default: null, ref: 'Paper' },
    invitedBy: { type: String, default: null, ref: 'User' },
    inviteType: { type: String, enum: ['hub_reviewer', 'paper_review'], default: 'hub_reviewer' },
    customDeadlineDays: { type: Number, default: null },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'expired', 'declined'], 
        default: 'pending' 
    },
    declineCategory: { type: String, default: null },
    declineReason: { type: String, default: null },
    declinedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
