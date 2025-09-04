import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';
import { createNotification } from '$lib/helpers/notificationHelper';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { paperId, hubId, reviewType = 'peer_review' } = await request.json();

        if (!paperId) {
            return json({ error: 'Paper ID is required' }, { status: 400 });
        }

        console.log('Received paperId:', paperId, 'Type:', typeof paperId);

        // Validar e converter o paperId para ObjectId
        let paperObjectId: ObjectId;
        try {
            // Se paperId já é uma string ObjectId válida
            if (typeof paperId === 'string' && paperId.length === 24) {
                paperObjectId = new ObjectId(paperId);
            } else if (typeof paperId === 'string') {
                // Se é uma string mas não é um ObjectId válido, pode ser um ID customizado
                // Primeiro tenta buscar pelo campo 'id' customizado
                const paperByCustomId = await db.collection('papers').findOne({ id: paperId });
                if (paperByCustomId) {
                    paperObjectId = paperByCustomId._id;
                } else {
                    return json({ error: 'Invalid paper ID format' }, { status: 400 });
                }
            } else {
                return json({ error: 'Paper ID must be a string' }, { status: 400 });
            }
        } catch (error) {
            console.error('Error converting paperId to ObjectId:', error);
            return json({ error: 'Invalid paper ID format' }, { status: 400 });
        }

        // Buscar informações do paper
        const paper = await db.collection('papers').findOne({ 
            _id: paperObjectId 
        });
        
        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Verificar se o usuário tem permissão para aceitar o paper
        if (!user.roles?.reviewer && !user.roles?.admin) {
            return json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const acceptedByName = `${user.firstName} ${user.lastName}`;
        const paperTitle = paper.title;

        // Atualizar status do paper
        await db.collection('papers').updateOne(
            { _id: paperObjectId },
            { 
                $set: { 
                    status: 'in review',
                    acceptedAt: new Date(),
                    acceptedBy: user._id,
                    reviewType: reviewType,
                    updatedAt: new Date()
                }
            }
        );

        // Criar template de notificação customizado para aceitação
        const template = {
            title: 'Paper Accepted for Review',
            content: `Your paper "${paperTitle}" has been accepted for review by ${acceptedByName}. The review process will begin soon.`,
            priority: 'medium' as const
        };

        // Notificar o autor do paper
        const authorId = paper.author || paper.createdBy;
        if (authorId && authorId !== user._id) {
            await createNotification({
                userId: String(authorId),
                type: 'paper_accepted',
                title: template.title,
                content: template.content,
                relatedUser: String(user._id),
                relatedPaperId: String(paperObjectId),
                relatedHubId: hubId ? String(hubId) : undefined,
                actionUrl: `/notifications?highlight=${paperObjectId}`,
                metadata: {
                    acceptedBy: String(user._id),
                    acceptedByName,
                    paperTitle,
                    reviewType,
                    acceptedAt: new Date()
                },
                priority: template.priority
            });
        }

        // Se houver coautores, notificar também
        if (paper.coAuthors && Array.isArray(paper.coAuthors)) {
            const { createBulkNotifications } = await import('$lib/helpers/notificationHelper');
            
            const coAuthorNotifications = paper.coAuthors
                .filter((coAuthorId: string) => coAuthorId !== user._id && coAuthorId !== authorId)
                .map((coAuthorId: string) => ({
                    userId: String(coAuthorId),
                    type: 'paper_accepted' as const,
                    title: template.title,
                    content: template.content,
                    relatedUser: String(user._id),
                    relatedPaperId: String(paperObjectId),
                    relatedHubId: hubId ? String(hubId) : undefined,
                    actionUrl: `/notifications?highlight=${paperObjectId}`,
                    metadata: {
                        acceptedBy: String(user._id),
                        acceptedByName,
                        paperTitle,
                        reviewType,
                        acceptedAt: new Date()
                    },
                    priority: template.priority
                }));

            if (coAuthorNotifications.length > 0) {
                await createBulkNotifications(coAuthorNotifications);
            }
        }

        return json({ 
            success: true, 
            message: 'Paper accepted for review successfully',
            paperId: String(paperObjectId),
            status: 'accepted_for_review',
            notificationsCreated: 1 + (paper.coAuthors?.length || 0)
        });

    } catch (error) {
        console.error('Error accepting paper for review:', error);
        return json({ 
            success: false, 
            error: 'Failed to accept paper for review',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};