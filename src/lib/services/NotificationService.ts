import Notification, { type INotification } from '../db/models/Notification';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { NotificationType } from '$lib/types/Notification';

export class NotificationService {
    static async createNotification(data: Partial<INotification>) {
        await start_mongo();
        
        const notification = new Notification({
            _id: crypto.randomUUID(),
            ...data
        });
        
        await notification.save();
        return notification;
    }

    static async getUserNotifications(userId: string, options?: {
        limit?: number;
        unreadOnly?: boolean;
        type?: NotificationType;

    }) {
        await start_mongo();
        
        const query: Record<string, unknown> = { user: userId };
        
        if (options?.unreadOnly) {
            query.isRead = false;
        }
        
        if (options?.type) {
            query.type = options.type;
        }

        return await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(options?.limit || 50)
            .populate('relatedUser', 'name email profilePicture');
    }

    static async markAsRead(notificationId: string, userId: string) {
        await start_mongo();
        
        return await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { 
                isRead: true,
                readAt: new Date()
            },
            { new: true }
        );
    }

    static async markAllAsRead(userId: string) {
        await start_mongo();
        
        return await Notification.updateMany(
            { user: userId, isRead: false },
            { 
                isRead: true,
                readAt: new Date()
            }
        );
    }

    static async getUnreadCount(userId: string) {
        await start_mongo();
        
        return await Notification.countDocuments({
            user: userId,
            isRead: false
        });
    }

    static async deleteNotification(notificationId: string, userId: string) {
        await start_mongo();
        
        return await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });
    }

    // Métodos específicos para diferentes tipos de notificação
    static async createPaperReviewRequest(data: {
        reviewerId: string;
        paperId: string;
        paperTitle: string;
        authorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const isHubPaper = !!data.hubId;
        
        return await this.createNotification({
            user: data.reviewerId,
            type: 'review_request',
            title: `Nova solicitação de revisão`,
            content: isHubPaper 
                ? `Você foi convidado para revisar o artigo "${data.paperTitle}" no hub "${data.hubName}"`
                : `Você foi convidado para revisar o artigo "${data.paperTitle}" de ${data.authorName}`,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}/review`,
            priority: 'high',
            metadata: {
                paperTitle: data.paperTitle,
                authorName: data.authorName,
                hubName: data.hubName,
                isHubPaper
            }
        });
    }

    static async createPaperSubmittedNotification(data: {
        adminIds: string[];
        paperId: string;
        paperTitle: string;
        authorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const isHubPaper = !!data.hubId;
        
        const notifications = data.adminIds.map(adminId => ({
            user: adminId,
            type: isHubPaper ? 'hub_paper_pending' : 'standalone_paper_pending',
            title: `Novo artigo pendente`,
            content: isHubPaper
                ? `Novo artigo "${data.paperTitle}" submetido ao hub "${data.hubName}" aguardando aprovação`
                : `Novo artigo "${data.paperTitle}" de ${data.authorName} aguardando aprovação`,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/admin/papers/${data.paperId}`,
            priority: 'medium',
            metadata: {
                paperTitle: data.paperTitle,
                authorName: data.authorName,
                hubName: data.hubName,
                isHubPaper
            }
        }));

        for (const notificationData of notifications) {
            await this.createNotification(notificationData);
        }
    }

    static async createHubInvitationNotification(data: {
        userId: string;
        hubId: string;
        hubName: string;
        inviterName: string;
        role: string;
    }) {
        return await this.createNotification({
            user: data.userId,
            type: 'hub_invitation',
            title: `Convite para hub`,
            content: `${data.inviterName} convidou você para participar do hub "${data.hubName}" como ${data.role}`,
            relatedHubId: data.hubId,
            actionUrl: `/hubs/${data.hubId}/invitation`,
            priority: 'high',
            metadata: {
                hubName: data.hubName,
                inviterName: data.inviterName,
                role: data.role
            }
        });
    }
}