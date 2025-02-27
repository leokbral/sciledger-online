// src/models/Like.ts
import mongoose, { Schema, Document } from 'mongoose';
//import { v4 as uuidv4 } from 'uuid'; // Importando a função para gerar UUID
import * as crypto from 'crypto';

// Definindo a interface para tipagem
interface ILike extends Document {
    likeId: string; // ID único gerado para o like
    user: string; // UUID do usuário que curtiu
    publication?: string; // UUID da publicação que foi curtida (opcional)
    comment?: string; // UUID do comentário que foi curtido (opcional)
    createdAt: Date; // Data de criação
}

// Definindo o schema
const LikeSchema: Schema = new Schema({
    likeId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o likeId
    user: { type: String, ref: 'User', required: true }, // UUID do usuário que curtiu
    publication: { type: String, ref: 'Publication' }, // UUID da publicação que foi curtida
    comment: { type: String, ref: 'Comment' }, // UUID do comentário que foi curtido
    createdAt: { type: Date, default: Date.now } // Data e hora de criação
});

// Exportando o modelo
const Like = mongoose.model<ILike>('Like', LikeSchema);
export default Like;
