import Notification, { type INotification } from '../db/models/Notification';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { NotificationType } from '$lib/types/Notification';
import * as crypto from 'crypto';

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
            type: isHubPaper ? 'hub_paper_pending' as const : 'standalone_paper_pending' as const,
            title: `Novo artigo pendente`,
            content: isHubPaper
                ? `Novo artigo "${data.paperTitle}" submetido ao hub "${data.hubName}" aguardando aprovação`
                : `Novo artigo "${data.paperTitle}" de ${data.authorName} aguardando aprovação`,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/admin/papers/${data.paperId}`,
            priority: 'medium' as const,
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

    // NEW NOTIFICATION METHODS FOR PAPER REVIEW LIFECYCLE

    /**
     * Cenário 1: Quando um editor aceita um artigo para revisão
     */
    static async createPaperAcceptedForReviewNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        reviewerIds: string[];
        editorName: string;
        hubId?: string;
        hubName?: string;
    }) {
        const notifications = [];

        // Notificar o autor que o artigo foi aceito para revisão
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_accepted_for_review',
                title: `Artigo aceito para revisão`,
                content: `Seu artigo "${data.paperTitle}" foi aceito para revisão por ${data.editorName}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    hubName: data.hubName
                }
            })
        );

        // Notificar os revisores designados com os detalhes do artigo
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'reviewer_assigned',
                    title: `Novo artigo para revisão`,
                    content: `Você foi designado para revisar o artigo "${data.paperTitle}" de ${data.authorName}`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}/review`,
                    priority: 'high',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        editorName: data.editorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Cenário 2: Quando um revisor aceita fazer a revisão
     */
    static async createReviewerAcceptedNotifications(data: {
        paperId: string;
        paperTitle: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        editorId: string;
        hubId?: string;
    }) {
        const notifications = [];

        // Notificar o editor que o revisor aceitou
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'reviewer_accepted_review',
                title: `Revisor aceitou a revisão`,
                content: `${data.reviewerName} aceitou revisar o artigo "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedUser: data.reviewerId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/manage`,
                priority: 'medium',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName
                }
            })
        );

        // Notificar o autor que o revisor aceitou
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'reviewer_accepted_review',
                title: `Revisor designado`,
                content: `Um revisor aceitou revisar seu artigo "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'medium',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName
                }
            })
        );

        return Promise.all(notifications);
    }

    /**
     * Cenário 3: Quando um revisor finaliza a revisão
     */
    static async createReviewSubmittedNotifications(data: {
        paperId: string;
        paperTitle: string;
        reviewId: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        editorId: string;
        reviewDecision: 'accept' | 'reject' | 'minor_revision' | 'major_revision';
        hubId?: string;
    }) {
        const notifications = [];

        const decisionText = {
            'accept': 'recomendou a aceitação',
            'reject': 'recomendou a rejeição',
            'minor_revision': 'solicitou revisões menores',
            'major_revision': 'solicitou revisões maiores'
        };

        // Notificar o editor que a revisão foi concluída
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'review_submitted',
                title: `Revisão concluída`,
                content: `${data.reviewerName} concluiu a revisão do artigo "${data.paperTitle}" e ${decisionText[data.reviewDecision]}`,
                relatedPaperId: data.paperId,
                relatedReviewId: data.reviewId,
                relatedUser: data.reviewerId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/reviews/${data.reviewId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName,
                    reviewDecision: data.reviewDecision
                }
            })
        );

        // Notificar o autor que a revisão foi feita (dependendo da decisão)
        const shouldNotifyAuthor = ['minor_revision', 'major_revision', 'accept'].includes(data.reviewDecision);
        if (shouldNotifyAuthor) {
            notifications.push(
                this.createNotification({
                    user: data.authorId,
                    type: 'review_submitted',
                    title: `Revisão recebida`,
                    content: `Seu artigo "${data.paperTitle}" foi revisado. O revisor ${decisionText[data.reviewDecision]}.`,
                    relatedPaperId: data.paperId,
                    relatedReviewId: data.reviewId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}/reviews`,
                    priority: 'high',
                    metadata: {
                        paperTitle: data.paperTitle,
                        reviewDecision: data.reviewDecision
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Cenário 4: Quando o autor envia as correções
     */
    static async createCorrectionsSubmittedNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        reviewerIds: string[];
        correctionVersion: number;
        requiresNewReview: boolean;
        hubId?: string;
    }) {
        const notifications = [];

        // Notificar o editor
        notifications.push(
            this.createNotification({
                user: data.editorId,
                type: 'corrections_submitted',
                title: `Correções enviadas`,
                content: `${data.authorName} enviou a versão ${data.correctionVersion} com correções do artigo "${data.paperTitle}"`,
                relatedPaperId: data.paperId,
                relatedUser: data.authorId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/corrections`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    authorName: data.authorName,
                    correctionVersion: data.correctionVersion,
                    requiresNewReview: data.requiresNewReview
                }
            })
        );

        // Se necessária nova rodada de revisão, notificar os revisores
        if (data.requiresNewReview) {
            for (const reviewerId of data.reviewerIds) {
                notifications.push(
                    this.createNotification({
                        user: reviewerId,
                        type: 'corrections_submitted',
                        title: `Nova versão para revisão`,
                        content: `${data.authorName} enviou correções do artigo "${data.paperTitle}". Uma nova revisão é necessária.`,
                        relatedPaperId: data.paperId,
                        relatedUser: data.authorId,
                        relatedHubId: data.hubId,
                        actionUrl: `/papers/${data.paperId}/review`,
                        priority: 'high',
                        metadata: {
                            paperTitle: data.paperTitle,
                            authorName: data.authorName,
                            correctionVersion: data.correctionVersion
                        }
                    })
                );
            }
        }

        return Promise.all(notifications);
    }

    /**
     * Cenário 5: Quando o artigo é aceito para publicação
     */
    static async createPaperFinalAcceptanceNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        editorName: string;
        reviewerIds: string[];
        hubId?: string;
        hubName?: string;
        publicationDate?: Date;
    }) {
        const notifications = [];

        // Notificar o autor da aceitação final
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_final_acceptance',
                title: `Artigo aceito para publicação! 🎉`,
                content: `Parabéns! Seu artigo "${data.paperTitle}" foi aceito para publicação por ${data.editorName}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'urgent',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    hubName: data.hubName,
                    publicationDate: data.publicationDate
                }
            })
        );

        // Opcionalmente notificar revisores do status final
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'paper_final_acceptance',
                    title: `Artigo aceito para publicação`,
                    content: `O artigo "${data.paperTitle}" que você revisou foi aceito para publicação`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}`,
                    priority: 'low',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }

    /**
     * Quando o artigo é rejeitado finalmente
     */
    static async createPaperFinalRejectionNotifications(data: {
        paperId: string;
        paperTitle: string;
        authorId: string;
        authorName: string;
        editorId: string;
        editorName: string;
        reviewerIds: string[];
        rejectionReason?: string;
        hubId?: string;
        hubName?: string;
    }) {
        const notifications = [];

        // Notificar o autor da rejeição final
        notifications.push(
            this.createNotification({
                user: data.authorId,
                type: 'paper_final_rejection',
                title: `Decisão final sobre o artigo`,
                content: `Seu artigo "${data.paperTitle}" não foi aceito para publicação. ${data.rejectionReason || 'Consulte os comentários dos revisores para mais detalhes.'}`,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: 'high',
                metadata: {
                    paperTitle: data.paperTitle,
                    editorName: data.editorName,
                    rejectionReason: data.rejectionReason,
                    hubName: data.hubName
                }
            })
        );

        // Opcionalmente notificar revisores do status final
        for (const reviewerId of data.reviewerIds) {
            notifications.push(
                this.createNotification({
                    user: reviewerId,
                    type: 'paper_final_rejection',
                    title: `Decisão final sobre artigo`,
                    content: `O artigo "${data.paperTitle}" que você revisou não foi aceito para publicação`,
                    relatedPaperId: data.paperId,
                    relatedUser: data.authorId,
                    relatedHubId: data.hubId,
                    actionUrl: `/papers/${data.paperId}`,
                    priority: 'low',
                    metadata: {
                        paperTitle: data.paperTitle,
                        authorName: data.authorName,
                        hubName: data.hubName
                    }
                })
            );
        }

        return Promise.all(notifications);
    }
}