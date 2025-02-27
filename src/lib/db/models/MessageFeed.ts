// // src/models/Message.ts
// import mongoose, { Schema, Document } from 'mongoose';
// import * as crypto from 'crypto';


// interface IMessage extends Document {
//     // sender: mongoose.Types.ObjectId;
//     // receiver: mongoose.Types.ObjectId;
//     messageId: string; // ID único gerado para a mensagem
//     sender: string; // UUID do usuário que enviou a mensagem
//     receiver: string; // UUID do usuário que recebeu a mensagem
//     content: string;
//     read: boolean;
//     createdAt: Date;
// }

// const MessageSchema: Schema = new Schema({
//     messageId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o messageId
//     sender: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
//     receiver: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
//     content: { type: String, required: true },
//     read: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now }
// });

// const Message = mongoose.model<IMessage>('Message', MessageSchema);
// export default Message;
import mongoose, { Document } from "mongoose";
import type { MessageFeed } from "$lib/types/MessageFeed"; // A interface deve estar correta
import  "$lib/db/models/MessageFeed"; // Certifique-se de que isso está correto
import { messageFeedSchema } from "../schemas/MessageFeedSchema";

export interface IMessageFeed extends Omit<MessageFeed, 'id'>, Document {} // Omit para evitar conflito

const MessageFeeds = mongoose.model<IMessageFeed>('MessageFeed', messageFeedSchema);
export default MessageFeeds;
