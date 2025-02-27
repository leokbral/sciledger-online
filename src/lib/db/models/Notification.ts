// src/models/Notification.ts
import mongoose, { Schema, Document } from 'mongoose';
import * as crypto from 'crypto';
//import { v4 as uuidv4 } from 'uuid'; // Importando a função para gerar UUID

// Definindo a interface para tipagem
interface INotification extends Document {
    notificationId: string; // ID único gerado para a notificação
    user: string; // UUID do usuário que recebeu a notificação
    type: string; // Tipo da notificação (ex: "like", "comment", "new_follower")
    content: string; // Conteúdo da notificação
    relatedUser?: string; // UUID do usuário relacionado (opcional)
    // mongoose.Types.ObjectId;
    relatedPublication?: string; // UUID da publicação relacionada (opcional)
    read: boolean; // Status de leitura
    createdAt: Date; // Data de criação
    updatedAt: Date; // Data de atualização
}

// Definindo o schema
const NotificationSchema: Schema = new Schema({
    notificationId: { type: String, default: () => crypto.randomUUID(), unique: true }, // Gerando um UUID por padrão para o notificationId
    user: { type: String, required: true }, // UUID do usuário que recebeu a notificação
    type: { type: String, required: true }, // Tipo da notificação
    content: { type: String, required: true }, // Conteúdo da notificação
    relatedUser: { type: String }, // UUID do usuário relacionado
    relatedPublication: { type: String }, // UUID da publicação relacionada
    read: { type: Boolean, default: false }, // Status de leitura
    createdAt: { type: Date, default: Date.now }, // Data e hora de criação
    updatedAt: { type: Date, default: Date.now } // Data e hora da última atualização
});

// Exportando o modelo
const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
