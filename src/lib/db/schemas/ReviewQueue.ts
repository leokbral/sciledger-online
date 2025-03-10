import { Schema } from "mongoose";

export const ReviewQueueSchema: Schema = new Schema({
    paperId: { type: String, required: true },
    assignedReviewers: [{ type: String, ref: 'User' }],
    peerReviewType: { type: String, enum: ['open', 'selected'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], required: true },
    assignedAt: { type: Date, default: Date.now }
}, { collection: 'reviewqueue' });
