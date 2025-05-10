import { Schema } from 'mongoose';
import * as crypto from 'crypto';

export const UserSchema: Schema = new Schema({
    _id: { type: String, required: true },
    id: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o userId
    firstName: { type: String, required: true, unique: false }, // Nome de usuário
    lastName: { type: String, required: true, unique: false }, // Nome de usuário
    country: { type: String, required: true, unique: false }, // Nome de usuário
    dob: { type: String, required: true, unique: false }, // Date of Birth
    username: { type: String, required: true, unique: true }, // Handle do usuário, único e obrigatório
    email: { type: String, required: true, unique: true }, // Email do usuário
    password: { type: String, required: true }, // Senha do usuário
    refreshToken: { type: String }, // Token para gerenciar sessões de login
    darkMode: { type: Boolean, default: false }, // Tema escuro
    roles: { // Definição de roles do usuário
        author: { type: Boolean, default: true },
        reviewer: { type: Boolean, default: false }
    },
    bio: { type: String, default: '' }, // Biografia do usuário com valor padrão
    profilePictureUrl: { type: String, default: '' }, // URL da foto de perfil com valor padrão
    institution: { type: String, default: '' }, // Instituição de ensino com valor padrão
    position: { type: String, default: '' }, // Cargo do usuário com valor padrão
    performanceReviews: { // Informações sobre a performance do usuário
        averageReviewDays: { type: Number, default: 0 }, // Média de dias de revisão com valor padrão
        recommendations: [{ type: String, default: '' }], // Recomendações recebidas
        responseTime: { type: Number, default: 0 }, // Tempo médio de resposta com valor padrão
        expertise: [{ type: String, default: '' }] // Áreas de expertise com valor padrão
    },
    connections: [{ type: String, ref: 'User' }], // IDs dos usuários conectados
    followers: [{ type: String, ref: 'User' }], // IDs dos seguidores
    following: [{ type: String, ref: 'User' }], // IDs dos usuários seguidos
    papers: [{ type: String, ref: 'Paper' }], // IDs das publicações do usuário
    hubs: [{ type: String, ref: 'Hub', default: [] }], // IDs dos hubs do usuário
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
});