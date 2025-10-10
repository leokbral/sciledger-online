import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';
import { NotificationService } from '$lib/services/NotificationService';
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

        const paperTitle = paper.title;
        const authorId = paper.author || paper.createdBy;

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

        // Buscar informações adicionais do editor e revisores designados
        const editor = await db.collection('users').findOne({ _id: user._id });
        const editorName = `${editor?.firstName || ''} ${editor?.lastName || ''}`.trim();

        // Buscar revisores designados (se existirem)
        const reviewerIds = paper.peer_review?.assignedReviewers || [];
        
        // Criar notificações usando o novo sistema
        await NotificationService.createPaperAcceptedForReviewNotifications({
            paperId: String(paperObjectId),
            paperTitle: paperTitle,
            authorId: String(authorId),
            authorName: paper.authorName || 'Autor',
            reviewerIds: reviewerIds.map((id: string) => String(id)),
            editorName: editorName,
            hubId: hubId ? String(hubId) : undefined,
            hubName: paper.hubName
        });

        // Se houver coautores, incluir nas notificações
        if (paper.coAuthors && Array.isArray(paper.coAuthors)) {
            for (const coAuthorId of paper.coAuthors) {
                if (coAuthorId !== user._id && coAuthorId !== authorId) {
                    await NotificationService.createNotification({
                        user: String(coAuthorId),
                        type: 'paper_accepted_for_review',
                        title: `Artigo aceito para revisão`,
                        content: `O artigo "${paperTitle}" foi aceito para revisão por ${editorName}`,
                        relatedPaperId: String(paperObjectId),
                        relatedHubId: hubId ? String(hubId) : undefined,
                        actionUrl: `/papers/${paperObjectId}`,
                        priority: 'high',
                        metadata: {
                            paperTitle: paperTitle,
                            editorName: editorName,
                            acceptedAt: new Date()
                        }
                    });
                }
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