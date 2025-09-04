import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';
import crypto from 'crypto';
import { createBulkNotifications, createNotification, NotificationTemplates } from '$lib/helpers/notificationHelper';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { paperId, reviewerIds, peerReviewType, paperTitle, hubId } = await request.json();

        // Buscar informações do paper
        const paper = await db.collection('papers').findOne({ _id: paperId });
        
        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        const assignedByName = `${user.firstName} ${user.lastName}`;
        const title = paperTitle || paper.title;

        // Criar notificações para os revisores
        const reviewerNotifications = reviewerIds.map((reviewerId: string) => {
            const template = NotificationTemplates.reviewRequest(title, assignedByName);
            
            return {
                userId: reviewerId,
                type: 'review_request' as const,
                title: template.title,
                content: template.content,
                relatedUser: user.id,
                relatedPaperId: paperId,
                relatedHubId: hubId,
                actionUrl: `/notifications?highlight=${paperId}`,
                metadata: {
                    peerReviewType,
                    assignedBy: user.id,
                    assignedByName,
                    paperTitle: title
                },
                priority: template.priority
            };
        });

        // Criar notificações em lote
        await createBulkNotifications(reviewerNotifications);

        // Criar atribuições de revisão
        const reviewAssignments = reviewerIds.map((reviewerId: string) => ({
            _id: crypto.randomUUID(),
            paperId: paperId,
            reviewerId: reviewerId,
            status: 'pending',
            peerReviewType,
            assignedAt: new Date(),
            completedAt: null,
            assignedBy: user.id
        }));

        if (reviewAssignments.length > 0) {
            await db.collection('reviewAssignments').insertMany(reviewAssignments);
        }

        // Atualizar status do paper
        await db.collection('papers').updateOne(
            { _id: paperId },
            { 
                $set: { 
                    status: 'under negotiation',
                    reviewers: reviewerIds,
                    updatedAt: new Date()
                }
            }
        );

        // Notificar autor do paper (se não for o mesmo que está atribuindo)
        if (paper.author !== user.id && paper.createdBy !== user.id) {
            const authorTemplate = NotificationTemplates.paperUnderReview(title, reviewerIds.length);
            
            await createNotification({
                userId: paper.author || paper.createdBy,
                type: 'paper_pending_review',
                title: authorTemplate.title,
                content: authorTemplate.content,
                relatedUser: user.id,
                relatedPaperId: paperId,
                relatedHubId: hubId,
                actionUrl: `/notifications?highlight=${paperId}`,
                metadata: {
                    reviewerCount: reviewerIds.length,
                    peerReviewType,
                    assignedBy: user.id
                },
                priority: authorTemplate.priority
            });
        }

        return json({ 
            success: true, 
            message: `Successfully assigned ${reviewerIds.length} reviewers`,
            assignedReviewers: reviewerIds.length,
            notificationsCreated: reviewerIds.length + 1
        });

    } catch (error) {
        console.error('Error assigning reviewers:', error);
        return json({ 
            success: false, 
            error: 'Failed to assign reviewers',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};