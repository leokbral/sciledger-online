// src/models/Tag.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ITag extends Document {
    name: string;
    publications: mongoose.Types.ObjectId[];
    createdAt: Date;
}

const TagSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    publications: [{ type: mongoose.Types.ObjectId, ref: 'Publication' }], // Publicações associadas à tag
    createdAt: { type: Date, default: Date.now }
});

const Tag = mongoose.model<ITag>('Tag', TagSchema);
export default Tag;
