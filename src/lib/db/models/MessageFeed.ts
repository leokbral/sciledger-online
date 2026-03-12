// // src/models/Message.ts
// import mongoose, { Schema, Document } from 'mongoose';
// import * as crypto from 'crypto';


// interface IMessage extends Document {
//     // sender: mongoose.Types.ObjectId;
//     // receiver: mongoose.Types.ObjectId;
//     messageId: string; // Unique ID generated for the message
//     sender: string; // UUID of the user who sent the message
//     receiver: string; // UUID of the user who received the message
//     content: string;
//     read: boolean;
//     createdAt: Date;
// }

// const MessageSchema: Schema = new Schema({
//     messageId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Generating a UUID as default for messageId
//     sender: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
//     receiver: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
//     content: { type: String, required: true },
//     read: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now }
// });

// const Message = mongoose.model<IMessage>('Message', MessageSchema);
// export default Message;
import mongoose, { Document } from "mongoose";
import type { MessageFeed } from "$lib/types/MessageFeed"; // The interface must be correct
import  "$lib/db/models/MessageFeed"; // Make sure this is correct
import { messageFeedSchema } from "../schemas/MessageFeedSchema";

export interface IMessageFeed extends Omit<MessageFeed, 'id'>, Document {} // Omit to avoid conflict

const MessageFeeds = mongoose.models.MessageFeed || mongoose.model<IMessageFeed>('MessageFeed', messageFeedSchema);
export default MessageFeeds;
