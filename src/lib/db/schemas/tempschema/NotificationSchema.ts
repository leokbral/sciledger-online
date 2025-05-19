import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const NotificationSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true }, // ID amigável para referência

    user: { type: String, ref: 'User', required: true }, // ID do usuário que recebe

    type: {
        type: String,
        required: true,
        enum: [
            'invitation',
            'comment',
            'connection_request',
            'paper_accepted',
            'paper_rejected',
            'system',
            'follow',
            'mention'
        ]
    },

    content: { type: String, required: true }, // Mensagem da notificação

    meta: { type: Schema.Types.Mixed, default: {} }, // Dados contextuais (paperId, inviteId, etc.)

    relatedUser: { type: String, ref: 'User' }, // ID de um usuário relacionado
    relatedPublication: { type: String }, // ID da publicação relacionada

    isRead: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
},
    { collection: 'notifications' });
