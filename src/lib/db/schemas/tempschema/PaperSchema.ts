import /* mongoose, */ { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const PaperSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    mainAuthor: { type: String, required: true, ref: 'User' },
    correspondingAuthor: { type: String, required: true, ref: 'User' },
    coAuthors: [{ type: String, ref: 'User' }],
    reviewers: [{ type: String, ref: 'User' }],
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    keywords: [{ type: String, required: true }],
    content: { type: String },
    pdfUrl: { type: String, required: true },
    paperPictures: [{ type: String }],
    citations: [{ type: String }],
    likes: [{ type: String }],
    comments: [{ type: String }],
    tags: [{ type: String }],
    status: {
        type: String,
        required: true,
        enum: ['draft', 'under negotiation', 'in review', 'needing corrections', 'published'],
        default: 'draft'
    },
    price: { type: Number, required: true },
    score: { type: Number, default: 0, min: 0, max: 5 },
    authors: [{ type: String, ref: 'User' }],
    peer_review: {
        type: [{
            reviewerId: { type: String, ref: 'User' },
            reviewStatus: {
                type: String,
                enum: ['pending', 'in review', 'completed'],
                default: 'pending'
            },
            reviewScore: { type: Number, min: 0, max: 5 },
            reviewFeedback: { type: String },
            reviewDate: { type: String }
        }],
        default: []
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    submittedBy: { type: String, required: true, ref: 'User' }
}, { collection: 'papers' });
