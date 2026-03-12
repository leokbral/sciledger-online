// src/models/Like.ts
import mongoose, { Schema, Document } from 'mongoose';
//import { v4 as uuidv4 } from 'uuid'; // Import function to generate UUID
import * as crypto from 'crypto';

// Interface definition for typing
interface ILike extends Document {
    likeId: string; // Unique ID generated for the like
    user: string; // UUID of the user who liked
    publication?: string; // UUID of the liked publication (optional)
    comment?: string; // UUID of the liked comment (optional)
    createdAt: Date; // Creation date
}

// Schema definition
const LikeSchema: Schema = new Schema({
    likeId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Generating a UUID as default for likeId
    user: { type: String, ref: 'User', required: true }, // UUID of the user who liked
    publication: { type: String, ref: 'Publication' }, // UUID of the liked publication
    comment: { type: String, ref: 'Comment' }, // UUID of the liked comment
    createdAt: { type: Date, default: Date.now } // Creation date and time
});

// Exporting the model
const Like = mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);
export default Like;
