import mongoose, { Schema } from 'mongoose';
// import { UserSchema } from './UserSchema'; // Ajuste o caminho conforme necessário

export const messageFeedSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true },
    currentMessage: { type: String},
    messages: [{
        _id: { type: String, required: true },
        id: { type: String, default: () => crypto.randomUUID(), unique: true },
        sender: { type: String, required: true, ref: 'User' }, // Referência ao usuário que enviou a mensagem
        message: { type: String, required: true }, // Conteúdo da mensagem
        isRead: { type: Boolean, default: false }, // Indica se a mensagem foi lida
        timestamp: { type: String, default: () => new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) }, // Timestamp formatado
        color: { type: String, default: 'variant-soft-primary' } // Cor da mensagem (exemplo de valor padrão)
        // color: { type: String, required: true }
    }]
});

// Modelo para a mensagem
const MessageFeed = mongoose.model('MessageFeed', messageFeedSchema);

export default MessageFeed;