import type { User } from './User';

export type Notification = {
    _id: string; // ID da notificação (usado pelo Mongoose como identificador primário)
    id: string; // ID único gerado, por exemplo, usando uuid
    user: User; // Usuário que recebeu a notificação
    type: 'invitation' | 'comment' | 'connection_request' | 'paper_accepted' | 'paper_rejected' | 'system' | 'follow' | 'mention'; // Tipo da notificação
    content: string; // Conteúdo da notificação
    relatedUser?: User; // Usuário relacionado (caso exista)
    relatedPublication?: string; // ID da publicação relacionada (caso exista)
    isRead: boolean; // Status de leitura
    createdAt: Date; // Data de criação
    updatedAt: Date; // Data de atualização
};
