import type { User } from './User';

export type NotificationType =
    | 'invitation'
    | 'comment'
    | 'connection_request'
    | 'paper_accepted'
    | 'paper_rejected'
    | 'paper_pending_review'
    | 'paper_submitted'
    | 'hub_invitation'
    | 'review_request'
    | 'review_completed'
    | 'system'
    | 'follow'
    | 'mention'
    | 'paper_published'
    | 'hub_paper_pending'
    | 'standalone_paper_pending';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Notification = {
    _id: string;
    id: string;
    user: User | string;
    type: NotificationType;
    title: string;
    content: string;
    relatedUser?: string;
    relatedPaperId?: string;
    relatedCommentId?: string;
    relatedHubId?: string;
    relatedReviewId?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>; 
    isRead: boolean;
    priority: NotificationPriority;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    readAt?: Date;
};

