import { Schema } from 'mongoose';

export const EmailReviewerInvitationSchema: Schema = new Schema({
    email: { type: String, required: true },
    hubId: { type: String, required: true, ref: 'Hub' },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'expired'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
