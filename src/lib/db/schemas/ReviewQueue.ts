import { Schema } from "mongoose";
import * as crypto from 'crypto';

export const ReviewQueueSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    paperId: { type: String, required: true }, // Paper ID
    reviewer: { type: String, ref: 'User', required: true }, // A single reviewer
    peerReviewType: { type: String, enum: ['open', 'selected'], required: true }, // Review type
    hubId: { type: String, required: false }, // Hub ID (optional)
    isLinkedToHub: { type: Boolean, required: true }, // Whether linked to a hub
    status: { type: String, enum: ['pending', 'accepted', 'declined'], required: true }, // Status
    assignedAt: { type: Date, required: true, default: Date.now }, // When assigned
    respondedAt: { type: Date, required: false }, // When responded
    createdAt: { type: Date, default: Date.now }, // Creation date
    updatedAt: { type: Date, default: Date.now }, // Update date
},
    { collection: 'reviewqueues' });