import mongoose, { Schema } from 'mongoose';
// import { UserSchema } from './UserSchema'; // Adjust the path as needed

export const messageFeedSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    currentMessage: { type: String},
    messages: [{
        _id: { type: String, required: true },
        id: { type: String, default: () => crypto.randomUUID(), unique: true },
        sender: { type: String, required: true, ref: 'User' }, // Reference to the user who sent the message
        message: { type: String, required: true }, // Message content
        isRead: { type: Boolean, default: false }, // Indicates whether the message was read
        timestamp: { type: String, default: () => new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) }, // Formatted timestamp
        color: { type: String, default: 'preset-tonal-primary' } // Message color (example default value)
        // color: { type: String, required: true }
    }]
});

// Modelo para a mensagem
const MessageFeed = mongoose.model('MessageFeed', messageFeedSchema);

export default MessageFeed;