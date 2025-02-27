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
    }, // Comentários da revisão
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'needs_revision'],
        default: 'pending',
        required: true
    },
    responseTime: {
        type: Number,
        default: 0
    }, // Tempo de resposta da revisão (em dias, por exemplo)
    assignedAt: {
        type: String,
        default: () => new Date().toISOString()
    }, // Data em que a revisão foi atribuída
    completedAt: {
        type: String
    }, // Data em que a revisão foi concluída
    feedbackForAuthor: {
        type: String
    }, // Feedback adicional para o autor do artigo
    feedbackForReviewer: {
        type: String
    }, // Feedback adicional para o revisor (ex: melhorias ou observações)
    isFeedbackAcknowledged: {
        type: Boolean,
        default: false
    }, // Se o feedback foi reconhecido pelo autor ou revisor
    createdAt: {
        type: String,
        default: () => new Date().toISOString()
    }, // Data de criação da revisão
    updatedAt: {
        type: String,
        default: () => new Date().toISOString()
    } // Data de atualização da revisão
}, { collection: 'reviews' });

