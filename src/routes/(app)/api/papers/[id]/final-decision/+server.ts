import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';
import { NotificationService } from '$lib/services/NotificationService';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ request, params, locals }) => {
    try {
        const user = locals.user;

        if (!user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { decision, rejectionReason } = await request.json();
        const paperId = params.id;

        if (!paperId) {
            return json({ error: 'Paper ID is required' }, { status: 400 });
        }

        if (!decision || !['accept', 'reject'].includes(decision)) {
            return json({ error: 'Valid decision (accept/reject) is required' }, { status: 400 });
        }

        // Verificar se o usuário tem permissão para tomar decisões finais
        if (!user.roles?.admin && !user.roles?.editor) {
            return json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Validar e converter o paperId para ObjectId
        let paperObjectId: ObjectId;
        try {
            if (typeof paperId === 'string' && paperId.length === 24) {
                paperObjectId = new ObjectId(paperId);
            } else {
                // Buscar pelo campo 'id' customizado
                const paperByCustomId = await db.collection('papers').findOne({ id: paperId });
                if (paperByCustomId) {
                    paperObjectId = paperByCustomId._id;
                } else {
                    return json({ error: 'Invalid paper ID format' }, { status: 400 });
                }
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

        const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
        const finalDecisionAt = new Date();

        // Atualizar status do paper
        await db.collection('papers').updateOne(
            { _id: paperObjectId },
            { 
                $set: { 
                    status: newStatus,
                    finalDecision: decision,
                    finalDecisionAt: finalDecisionAt,
                    finalDecisionBy: user._id,
                    rejectionReason: decision === 'reject' ? rejectionReason : undefined,
                    updatedAt: new Date()
                }
            }
        );

        // Buscar informações para as notificações
        const editor = await db.collection('users').findOne({ _id: user._id });
        const editorName = `${editor?.firstName || ''} ${editor?.lastName || ''}`.trim();
        
        const paperTitle = paper.title;
        const authorId = String(paper.author || paper.mainAuthor || paper.createdBy);
        const authorName = paper.authorName || 'Autor';
        
        // Buscar revisores
        const reviewerIds = paper.peer_review?.assignedReviewers?.map((id: string | object) => String(id)) || [];

        // Criar notificações baseadas na decisão
        if (decision === 'accept') {
            await NotificationService.createPaperFinalAcceptanceNotifications({
                paperId: String(paperObjectId),
                paperTitle: paperTitle,
                authorId: authorId,
                authorName: authorName,
                editorId: String(user._id),
                editorName: editorName,
                reviewerIds: reviewerIds,
                hubId: paper.hubId ? String(paper.hubId) : undefined,
                hubName: paper.hubName,
                publicationDate: finalDecisionAt
            });
        } else {
            await NotificationService.createPaperFinalRejectionNotifications({
                paperId: String(paperObjectId),
                paperTitle: paperTitle,
                authorId: authorId,
                authorName: authorName,
                editorId: String(user._id),
                editorName: editorName,
                reviewerIds: reviewerIds,
                rejectionReason: rejectionReason,
                hubId: paper.hubId ? String(paper.hubId) : undefined,
                hubName: paper.hubName
            });
        }

        return json({ 
            success: true, 
            message: `Paper ${decision === 'accept' ? 'accepted' : 'rejected'} successfully`,
            paperId: String(paperObjectId),
            status: newStatus,
            finalDecision: decision,
            finalDecisionAt: finalDecisionAt
        });

    } catch (error) {
        console.error('Error making final decision:', error);
        return json({ 
            success: false, 
            error: 'Failed to make final decision',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
};