import type { User } from './User';

export interface Message {
    id: string;
    sender: User;
    message: string; // Message content
    isRead: boolean; // Indicates whether the message was read
    // createdAt: Date; // Date and time the message was sent
    // updatedAt: Date; // Date and time of the last update (e.g. when marked as read)
    timestamp: string;
    color: string;
}

// Interface for a message
export interface MessageFeed {
    id: string;
    currentMessage: string;
    messages: Message[];
}
