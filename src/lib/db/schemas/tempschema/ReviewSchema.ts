import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const ReviewSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    paper: { type: String, required: true, ref: 'Paper' },
    reviewer: { type: String, required: true, ref: 'User' },
    reviewType: {
        type: String,
        enum: ['open', 'selected'],
        required: true,
        default: 'open'
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 5
    },
    comments: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'needs_revision'],
        default: 'pending',
        required: true
    },
    responseTime: {
        type: Number,
        default: 0
    },
    assignedAt: {
        type: String,
        default: () => new Date().toISOString()
    },
    completedAt: {
        type: String
    },
    feedbackForAuthor: {
        type: String
    },
    feedbackForReviewer: {
        type: String
    },
    isFeedbackAcknowledged: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString()
    },
    updatedAt: {
        type: String,
        default: () => new Date().toISOString()
    }
}, { collection: 'reviews' });
