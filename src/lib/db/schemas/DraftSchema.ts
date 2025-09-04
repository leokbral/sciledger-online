import mongoose, { Schema } from "mongoose";

export const DraftSchema: Schema = new Schema({
    _id: { type: String, required: true, unique: true, },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    paperId: {
        type: String,
        required: true
    },
    reviewerId: {
        type: String,
        required: true
    },
    paperTitle: {
        type: String,
        required: true
    },
    form: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

DraftSchema.index({ paperId: 1, reviewerId: 1 }, { unique: true });

export const Draft = mongoose.models.Draft || mongoose.model('Draft', DraftSchema);