import { Schema } from "mongoose";

export const NotificationSchema: Schema = new Schema({
    _id: { type: String, required: true, unique: true, },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    user: { type: String, required: true, ref: 'User' },
    type: {
        type: String,
        enum: [
            'invitation',
            'comment',
            'connection_request',
            'paper_accepted',
            'paper_rejected',
            'paper_pending_review',
            'paper_submitted',
            'hub_invitation',
            'review_request',
            'review_completed',
            'system',
            'follow',
            'mention',
            'paper_published',
            'hub_paper_pending',
            'standalone_paper_pending'
        ],
        required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true, },
    relatedUser: { type: String, ref: 'User', },
    relatedPaperId: { type: String, },
    relatedCommentId: { type: String, },
    relatedHubId: { type: String, },
    relatedReviewId: { type: String, },
    actionUrl: { type: String }, // URL para onde o usuário deve ser redirecionado
    metadata: { type: Schema.Types.Mixed }, // Dados adicionais específicos do tipo
    isRead: {
        type: Boolean,
        default: false,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    expiresAt: { type: Date }, // Para notificações temporárias
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date }
},
    {
        collection: 'notifications',
        timestamps: true
    });

// Índices para performance
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });