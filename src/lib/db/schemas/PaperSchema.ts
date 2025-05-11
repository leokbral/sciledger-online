import /* mongoose, */ { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const PaperSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o id
    mainAuthor: { type: String, required: true, ref: 'User' }, // Autor principal como UUID
    correspondingAuthor: { type: String, required: true, ref: 'User' }, // Autor correspondente como UUID
    coAuthors: [{ type: String, ref: 'User' }], // Lista de coautores como UUIDs
    reviewers: [{ type: String, ref: 'User' }], // Lista de revisores como UUIDs
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    keywords: [{ type: String, required: true }],
    content: { type: String },
    pdfUrl: { type: String, required: true },
    paperPictures: [{ type: String }], // Alterado de articlePictures para paperPictures
    citations: [{ type: String }], // Lista de citações como UUIDs
    likes: [{ type: String }], // Lista de usuários que curtiram como UUIDs
    comments: [{ type: String }], // Lista de comentários como UUIDs
    tags: [{ type: String }],
    status: { type: String, required: true, enum: ['draft', 'under negotiation', 'in review', 'needing corrections', 'published'], default: 'draft' },
    price: { type: Number, required: true }, // Campo para o preço da publicação
    score: { type: Number, default: 0, min: 0, max: 5 }, // Campo para a pontuação da publicação, com um valor padrão de 0 e limite de 0 a 5
    authors: [{ type: String, ref: 'User' }],
    peer_review: { type: String },
    // peer_review: [{ type: String, ref: 'Review' }], // Agora este campo faz referência ao ReviewSchema
    /* peer_review: {
        type: {
            reviewType: { type: String, enum: ['open', 'selected'], required: true }, // Tipo de revisão: 'open' para qualquer revisor, 'selected' para revisores específicos
            assignedReviewers: [{ type: String, ref: 'User' }], // Lista de revisores específicos se 'selected'
            reviewerResponses: [{
                reviewerId: { type: String, ref: 'User' }, // UUID do revisor
                counterProposal: { type: String }, // Proposta de contraproposta do revisor
                responseStatus: { type: String, enum: ['accepted', 'declined', 'counter-proposal', 'pending'], default: 'pending' }, // Status geral da resposta do revisor
                reviewerComments: [{ type: String }] // Comentários do revisor
            }]
        }
    }, */
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    submittedBy: { type: String, required: true, ref: 'User' }, // Campo adicionado para quem submeteu o paper
    hubId: { type: String, ref: 'Hub', required: false },
    isLinkedToHub: { type: Boolean, default: false }

}, { collection: 'papers' });

