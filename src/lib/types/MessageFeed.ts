import type { User } from './User';

export interface Message {
    id: string;
    sender: User;
    message: string; // Conteúdo da mensagem
    isRead: boolean; // Indica se a mensagem foi lida
    // createdAt: Date; // Data e hora em que a mensagem foi enviada
    // updatedAt: Date; // Data e hora da última atualização (por exemplo, quando foi marcada como lida)
    timestamp: string;
    color: string;
}

// Interface para uma mensagem
export interface MessageFeed {
    id: string;
    currentMessage: string;
    messages: Message[];
}
