// src/models/Comment.ts
import mongoose, { Schema, Document } from 'mongoose';
import * as crypto from 'crypto';
//import { v4 as uuidv4 } from 'uuid'; // Import function to generate UUID

// Interface definition for typing
interface IComment extends Document {
    commentId: string; // Unique ID generated for the comment
    publication: string; // UUID of the associated publication
    commentAuthor: string; // UUID of the comment author
    content: string; // Comment content
    likes: string[]; // UUIDs of users who liked the comment
    replies: string[]; // UUIDs of reply comments
    createdAt: Date; // Creation date
    updatedAt: Date; // Update date
}

// Schema definition
const CommentSchema: Schema = new Schema({
    commentId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Generating a UUID as default for commentId
    publication: { type: String, ref: 'Publication', required: true }, // UUID of the associated publication
    commentAuthor: { type: String, ref: 'User', required: true }, // UUID of the comment author
    content: { type: String, required: true }, // Comment content
    likes: [{ type: String, ref: 'User' }], // UUIDs of users who liked the comment
    replies: [{ type: String, ref: 'Comment' }], // UUIDs of reply comments
    createdAt: { type: Date, default: Date.now }, // Creation date and time
    updatedAt: { type: Date, default: Date.now } // Last update date and time
});

// Exporting the model
const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
