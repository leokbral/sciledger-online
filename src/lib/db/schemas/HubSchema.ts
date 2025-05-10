import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const HubSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: { type: String, required: true, ref: 'User' }, // Quem criou o evento
    startDate: { type: String, required: true }, // Data do início do evento
    endDate: { type: String, required: true }, // Data do fim do evento
    submissionStartDate: { type: String, required: true }, // Início da submissão
    submissionEndDate: { type: String, required: true }, // Fim da submissão
    reviewers: [{ type: String, ref: 'User' }], // Revisores que participam do evento
    submittedPapers: [{ type: String, ref: 'Paper' }], // Artigos submetidos
    location: { type: String, default: 'online' }, // Pode ser 'online', 'physical' ou algo mais específico
    tags: [{ type: String }],
    status: {
        type: String,
        enum: ['draft', 'open', 'in_review', 'closed'],
        default: 'draft'
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, { collection: 'hubs' });
