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
            'system',
            'follow',
            'mention',
        ],
        required: true,
    },
    content: { type: String, required: true, },
    relatedUser: { type: Schema.Types.ObjectId, ref: 'User', },
    relatedPaperId: { type: String, },
    relatedCommentId: { type: String, },
    relatedHubId: { type: String, },
    isRead: {
        type: Boolean, default: false,
    },
},
    { collection: 'notifications' });