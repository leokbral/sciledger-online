import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const ReviewAssignmentSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    paperId: { type: String, required: true, ref: 'Paper' },
    reviewerId: { type: String, required: true, ref: 'User' },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'declined', 'completed', 'expired', 'overdue'], 
        default: 'pending' 
    },
    assignedAt: { type: Date, required: true, default: Date.now },
    acceptedAt: { type: Date }, // Quando o revisor aceitou
    completedAt: { type: Date }, // Quando a revisão foi completada
    deadline: { type: Date }, // 15 dias após aceitar
    respondedAt: { type: Date }, // Quando respondeu (aceitar/recusar)
    hubId: { type: String, ref: 'Hub' },
    isLinkedToHub: { type: Boolean, default: false },
    remindersSent: { 
        type: Number, 
        default: 0 
    }, // Quantos lembretes foram enviados
    lastReminderAt: { type: Date }, // Último lembrete enviado
    notes: { type: String }, // Notas adicionais
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { 
    collection: 'reviewAssignments',
    timestamps: true 
});

// Índices para performance
ReviewAssignmentSchema.index({ paperId: 1, reviewerId: 1 }, { unique: true });
ReviewAssignmentSchema.index({ reviewerId: 1, status: 1 });
ReviewAssignmentSchema.index({ deadline: 1, status: 1 });
ReviewAssignmentSchema.index({ status: 1, assignedAt: -1 });

// Middleware para calcular deadline quando aceita
ReviewAssignmentSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'accepted' && !this.deadline) {
        this.acceptedAt = new Date();
        this.deadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 dias
    }
    
    if (this.isModified()) {
        this.updatedAt = new Date();
    }
    
    next();
});