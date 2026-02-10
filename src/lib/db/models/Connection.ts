// src/models/Connection.ts
import mongoose, { Schema, Document } from 'mongoose';

interface IConnection extends Document {
    user: mongoose.Types.ObjectId;
    connectedUser: mongoose.Types.ObjectId;
    status: string; // ex: "pending", "accepted", "rejected"
    createdAt: Date;
    updatedAt: Date;
}

const ConnectionSchema: Schema = new Schema({
    user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    connectedUser: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Connection = mongoose.models.Connection || mongoose.model<IConnection>('Connection', ConnectionSchema);
export default Connection;
