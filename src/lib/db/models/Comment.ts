// src/models/Comment.ts
import mongoose, { Schema, Document } from 'mongoose';
import * as crypto from 'crypto';
//import { v4 as uuidv4 } from 'uuid'; // Importando a função para gerar UUID

// Definindo a interface para tipagem
interface IComment extends Document {
    commentId: string; // ID único gerado para o comentário
    publication: string; // UUID da publicação associada
    commentAuthor: string; // UUID do autor do comentário
    content: string; // Conteúdo do comentário
    likes: string[]; // UUIDs dos usuários que curtiram o comentário
    replies: string[]; // UUIDs dos comentários que são respostas a este comentário
    createdAt: Date; // Data de criação
    updatedAt: Date; // Data de atualização
}

// Definindo o schema
const CommentSchema: Schema = new Schema({
    commentId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o commentId
    publication: { type: String, ref: 'Publication', required: true }, // UUID da publicação associada
    commentAuthor: { type: String, ref: 'User', required: true }, // UUID do autor do comentário
    content: { type: String, required: true }, // Conteúdo do comentário
    likes: [{ type: String, ref: 'User' }], // UUIDs dos usuários que curtiram o comentário
    replies: [{ type: String, ref: 'Comment' }], // UUIDs dos comentários que são respostas
    createdAt: { type: Date, default: Date.now }, // Data e hora de criação
    updatedAt: { type: Date, default: Date.now } // Data e hora da última atualização
});

// Exportando o modelo
const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
