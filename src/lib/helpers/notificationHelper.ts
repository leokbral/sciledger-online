import { db } from '$lib/db/mongo';
import crypto from 'crypto';

export interface CreateNotificationParams {
    userId: string;
    type: 'invitation' | 'comment' | 'connection_request' | 'paper_accepted' | 'paper_rejected' | 
          'paper_pending_review' | 'paper_submitted' | 'hub_invitation' | 'review_request' | 
          'review_completed' | 'system' | 'follow' | 'mention' | 'paper_published' | 
          'hub_paper_pending' | 'standalone_paper_pending';
    title: string;
    content: string;
    relatedUser?: string;
    relatedPaperId?: string;
    relatedCommentId?: string;
    relatedHubId?: string;
    relatedReviewId?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt?: Date;
}

export async function createNotification(params: CreateNotificationParams) {
    const notificationId = crypto.randomUUID();
    
    const notification = {
        // _id: notificationId,
        id: notificationId,
        user: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        relatedUser: params.relatedUser,
        relatedPaperId: params.relatedPaperId,
        relatedCommentId: params.relatedCommentId,
        relatedHubId: params.relatedHubId,
        relatedReviewId: params.relatedReviewId,
        actionUrl: params.actionUrl,
        metadata: params.metadata,
        isRead: false,
        priority: params.priority || 'medium',
        expiresAt: params.expiresAt,
        createdAt: new Date(),
        readAt: null
    };

    await db.collection('notifications').insertOne(notification);
    return notification;
}

export async function createBulkNotifications(notifications: CreateNotificationParams[]) {
    if (notifications.length === 0) return [];

    const notificationDocs = notifications.map(params => {
        const notificationId = crypto.randomUUID();
        return {
            // _id: notificationId,
            id: notificationId,
            user: params.userId,
            type: params.type,
            title: params.title,
            content: params.content,
            relatedUser: params.relatedUser,
            relatedPaperId: params.relatedPaperId,
            relatedCommentId: params.relatedCommentId,
            relatedHubId: params.relatedHubId,
            relatedReviewId: params.relatedReviewId,
            actionUrl: params.actionUrl,
            metadata: params.metadata,
            isRead: false,
            priority: params.priority || 'medium',
            expiresAt: params.expiresAt,
            createdAt: new Date(),
            readAt: null
        };
    });

    await db.collection('notifications').insertMany(notificationDocs);
    return notificationDocs;
}

// Templates de notificação expandidos
export const NotificationTemplates = {
    reviewRequest: (paperTitle: string, assignedByName: string) => ({
        title: 'New Review Request',
        content: `You have been assigned to review the paper "${paperTitle}" by ${assignedByName}`,
        priority: 'high' as const
    }),

    paperSubmitted: (paperTitle: string, hubName?: string) => ({
        title: 'Paper Submitted',
        content: `Your paper "${paperTitle}" has been successfully submitted${hubName ? ` to ${hubName}` : ''}`,
        priority: 'medium' as const
    }),

    paperUnderReview: (paperTitle: string, reviewerCount: number) => ({
        title: 'Paper Under Review',
        content: `Your paper "${paperTitle}" has been assigned to ${reviewerCount} reviewer${reviewerCount > 1 ? 's' : ''} and is now under review.`,
        priority: 'medium' as const
    }),

    reviewCompleted: (paperTitle: string, reviewerName: string) => ({
        title: 'Review Completed',
        content: `${reviewerName} has completed their review of "${paperTitle}"`,
        priority: 'medium' as const
    }),

    paperAccepted: (paperTitle: string, hubName?: string) => ({
        title: 'Paper Accepted',
        content: `Congratulations! Your paper "${paperTitle}"${hubName ? ` has been accepted to ${hubName}` : ' has been accepted'}`,
        priority: 'high' as const
    }),

    paperRejected: (paperTitle: string, hubName?: string) => ({
        title: 'Paper Decision',
        content: `Your paper "${paperTitle}"${hubName ? ` submitted to ${hubName}` : ''} has been reviewed`,
        priority: 'medium' as const
    }),

    hubInvitation: (hubName: string, inviterName: string) => ({
        title: 'Hub Invitation',
        content: `You have been invited to join the hub "${hubName}" by ${inviterName}`,
        priority: 'medium' as const
    }),

    paperPublished: (paperTitle: string) => ({
        title: 'Paper Published',
        content: `Your paper "${paperTitle}" has been published and is now available`,
        priority: 'high' as const
    }),

    commentReceived: (paperTitle: string, commenterName: string) => ({
        title: 'New Comment',
        content: `${commenterName} commented on your paper "${paperTitle}"`,
        priority: 'low' as const
    }),

    connectionRequest: (requesterName: string) => ({
        title: 'Connection Request',
        content: `${requesterName} wants to connect with you`,
        priority: 'low' as const
    }),

    follow: (followerName: string) => ({
        title: 'New Follower',
        content: `${followerName} started following you`,
        priority: 'low' as const
    }),

    mention: (mentionerName: string, context: string) => ({
        title: 'You were mentioned',
        content: `${mentionerName} mentioned you in ${context}`,
        priority: 'medium' as const
    }),

    paperAcceptedForReview: (paperTitle: string, acceptedBy: string) => ({
        title: 'Paper Accepted for Review',
        content: `Your paper "${paperTitle}" has been accepted for review by ${acceptedBy}. The review process will begin soon.`,
        priority: 'medium' as const
    })
};