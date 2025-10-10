import { createNotification, createBulkNotifications, NotificationTemplates } from '$lib/helpers/notificationHelper';
import { db } from '$lib/db/mongo';
import { ObjectId } from 'mongodb';

export class PaperNotificationService {
    
    /**
     * Notifica quando um revisor aceita uma atribuição de revisão
     */
    static async notifyReviewerAcceptedAssignment(data: {
        paperId: string;
        paperTitle: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        coAuthorIds?: string[];
    }) {
        const template = NotificationTemplates.reviewerAcceptedAssignment(data.paperTitle, data.reviewerName);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'reviewer_accepted_assignment',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedUser: data.reviewerId,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                reviewerName: data.reviewerName,
                reviewerId: data.reviewerId,
                acceptedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'reviewer_accepted_assignment' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedUser: data.reviewerId,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName,
                    reviewerId: data.reviewerId,
                    acceptedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando um revisor recusa uma atribuição de revisão
     */
    static async notifyReviewerDeclinedAssignment(data: {
        paperId: string;
        paperTitle: string;
        reviewerId: string;
        reviewerName: string;
        authorId: string;
        coAuthorIds?: string[];
    }) {
        const template = NotificationTemplates.reviewerDeclinedAssignment(data.paperTitle, data.reviewerName);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'reviewer_declined_assignment',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedUser: data.reviewerId,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                reviewerName: data.reviewerName,
                reviewerId: data.reviewerId,
                declinedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'reviewer_declined_assignment' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedUser: data.reviewerId,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName,
                    reviewerId: data.reviewerId,
                    declinedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando o status de um paper muda
     */
    static async notifyPaperStatusChanged(data: {
        paperId: string;
        paperTitle: string;
        oldStatus: string;
        newStatus: string;
        authorId: string;
        coAuthorIds?: string[];
        hubId?: string;
        changedBy?: string;
    }) {
        const template = NotificationTemplates.paperStatusChanged(data.paperTitle, data.oldStatus, data.newStatus);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'paper_status_changed',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            relatedUser: data.changedBy,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                oldStatus: data.oldStatus,
                newStatus: data.newStatus,
                changedAt: new Date(),
                changedBy: data.changedBy
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'paper_status_changed' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                relatedUser: data.changedBy,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    oldStatus: data.oldStatus,
                    newStatus: data.newStatus,
                    changedAt: new Date(),
                    changedBy: data.changedBy
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando uma fase do paper muda
     */
    static async notifyPaperPhaseChanged(data: {
        paperId: string;
        paperTitle: string;
        phase: string;
        authorId: string;
        coAuthorIds?: string[];
        hubId?: string;
    }) {
        const template = NotificationTemplates.paperPhaseChanged(data.paperTitle, data.phase);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'paper_phase_changed',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                phase: data.phase,
                changedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'paper_phase_changed' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    phase: data.phase,
                    changedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando todas as revisões são completadas
     */
    static async notifyAllReviewsCompleted(data: {
        paperId: string;
        paperTitle: string;
        reviewCount: number;
        authorId: string;
        coAuthorIds?: string[];
        hubId?: string;
    }) {
        const template = NotificationTemplates.allReviewsCompleted(data.paperTitle, data.reviewCount);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'all_reviews_completed',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                reviewCount: data.reviewCount,
                completedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'all_reviews_completed' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewCount: data.reviewCount,
                    completedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando um paper precisa de correções
     */
    static async notifyPaperNeedsCorrections(data: {
        paperId: string;
        paperTitle: string;
        correctionCount: number;
        authorId: string;
        coAuthorIds?: string[];
        hubId?: string;
    }) {
        const template = NotificationTemplates.paperNeedsCorrections(data.paperTitle, data.correctionCount);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'paper_needs_corrections',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}/corrections`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                correctionCount: data.correctionCount,
                requestedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'paper_needs_corrections' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}/corrections`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    correctionCount: data.correctionCount,
                    requestedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Notifica quando uma revisão individual é completada
     */
    static async notifyReviewCompleted(data: {
        paperId: string;
        paperTitle: string;
        reviewId: string;
        reviewerName: string;
        authorId: string;
        coAuthorIds?: string[];
        hubId?: string;
    }) {
        const template = NotificationTemplates.reviewCompleted(data.paperTitle, data.reviewerName);
        
        // Notificar autor principal
        await createNotification({
            userId: data.authorId,
            type: 'review_completed',
            title: template.title,
            content: template.content,
            relatedPaperId: data.paperId,
            relatedReviewId: data.reviewId,
            relatedHubId: data.hubId,
            actionUrl: `/papers/${data.paperId}`,
            priority: template.priority,
            metadata: {
                paperTitle: data.paperTitle,
                reviewerName: data.reviewerName,
                reviewId: data.reviewId,
                completedAt: new Date()
            }
        });

        // Notificar coautores se houver
        if (data.coAuthorIds && data.coAuthorIds.length > 0) {
            const coAuthorNotifications = data.coAuthorIds.map(coAuthorId => ({
                userId: coAuthorId,
                type: 'review_completed' as const,
                title: template.title,
                content: template.content,
                relatedPaperId: data.paperId,
                relatedReviewId: data.reviewId,
                relatedHubId: data.hubId,
                actionUrl: `/papers/${data.paperId}`,
                priority: template.priority,
                metadata: {
                    paperTitle: data.paperTitle,
                    reviewerName: data.reviewerName,
                    reviewId: data.reviewId,
                    completedAt: new Date()
                }
            }));

            await createBulkNotifications(coAuthorNotifications);
        }
    }

    /**
     * Função auxiliar para obter informações do paper
     */
    static async getPaperInfo(paperId: string) {
        // Tentar buscar primeiro por ID customizado, depois por _id ObjectId
        let paper = await db.collection('papers').findOne({ id: paperId });
        
        if (!paper) {
            try {
                // Se não encontrou por ID customizado, tenta por _id ObjectId
                paper = await db.collection('papers').findOne({ _id: new ObjectId(paperId) });
            } catch (error) {
                // Se não conseguir converter para ObjectId, o paper não existe
                console.error('Error finding paper:', error);
            }
        }
        
        if (!paper) {
            throw new Error(`Paper with ID ${paperId} not found`);
        }

        // Obter informações dos autores
        const authorIds = [paper.mainAuthor, paper.correspondingAuthor, ...(paper.coAuthors || [])];
        const uniqueAuthorIds = [...new Set(authorIds.filter(Boolean))];
        
        const authors = await db.collection('users').find({
            _id: { $in: uniqueAuthorIds }
        }).toArray();

        const authorInfo = authors.reduce((acc, author) => {
            const authorIdStr = author._id.toString();
            acc[authorIdStr] = {
                name: `${author.firstName} ${author.lastName}`,
                email: author.email
            };
            return acc;
        }, {} as Record<string, { name: string; email: string }>);

        return {
            paper,
            authorInfo,
            mainAuthorId: paper.mainAuthor,
            coAuthorIds: paper.coAuthors || []
        };
    }
}