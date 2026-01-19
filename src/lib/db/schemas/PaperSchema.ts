import { Schema } from 'mongoose';
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
    peer_review: {
        type: {
            reviewType: { type: String, enum: ['open', 'selected'], required: true },
            assignedReviewers: [{ type: String, ref: 'User' }],
            responses: [{
                _id: false, // Desabilitar _id automático do Mongoose
                reviewerId: { type: String, ref: 'User' },
                status: {
                    type: String,
                    enum: ['pending', 'accepted', 'declined', 'completed'],
                    default: 'pending'
                },
                responseDate: { type: Date },         // Quando aceitou/recusou
                assignedAt: { type: Date },           // Quando foi oficialmente atribuído
                completedAt: { type: Date },          // Quando terminou a revisão
                reviewId: { type: String, ref: 'Review' }  // ID da review conectada
            }],
            // Adicionar referências às reviews
            reviews: [{ type: String, ref: 'Review' }], // Lista de reviews associadas
            averageScore: { type: Number, default: 0, min: 0, max: 5 }, // Média das avaliações
            reviewCount: { type: Number, default: 0 }, // Número de reviews completadas
            reviewStatus: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' }
        }
    },

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
    isLinkedToHub: { type: Boolean, default: false },
    
    // Campo para armazenar o progresso das correções (checklist)
    correctionProgress: {
        type: Map,
        of: Boolean,
        default: new Map()
    },
    
    // Sistema de Slots de Revisão (máximo 3 revisores)
    reviewSlots: [{
        _id: false, // Desabilitar _id automático do Mongoose
        slotNumber: { type: Number, required: true }, // 1, 2, ou 3
        reviewerId: { type: String, ref: 'User', default: null }, // ID do revisor (null se vazio)
        status: { 
            type: String, 
            enum: ['available', 'pending', 'occupied', 'declined'], 
            default: 'available' 
        },
        invitedAt: { type: Date }, // Quando o convite foi enviado
        acceptedAt: { type: Date }, // Quando o revisor aceitou
        declinedAt: { type: Date } // Quando o revisor recusou
    }],
    maxReviewSlots: { type: Number, default: 3 }, // Número máximo de slots
    availableSlots: { type: Number, default: 3 }, // Slots disponíveis
    
    // Track which review round this paper is in (1 = first review, 2 = review after corrections)
    reviewRound: { type: Number, default: 1 },
    
    // Track phase timestamps for each round
    phaseTimestamps: {
        round1Start: { type: Date },
        round1End: { type: Date },
        correctionStart: { type: Date },
        correctionEnd: { type: Date },
        round2Start: { type: Date },
        round2End: { type: Date }
    }

}, { collection: 'papers' });

