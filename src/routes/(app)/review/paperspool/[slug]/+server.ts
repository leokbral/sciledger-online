import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { NotificationService } from '$lib/services/NotificationService';
import type { User } from '$lib/types/User';
import * as crypto from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
    await start_mongo();

    try {
        const { paperId, reviewerId } = await request.json();
        const user = locals.user;

        if (!paperId || !reviewerId) {
            return json({ error: 'Paper ID and reviewer ID are required.' }, { status: 400 });
        }

        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const paper = await Papers.findOne({ id: paperId });

        if (!paper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        if (!paper.peer_review) {
            paper.peer_review = {
                reviewType: 'selected',
                responses: [],
                reviews: [],
                assignedReviewers: [],
                averageScore: 0,
                reviewCount: 0,
                reviewStatus: 'not_started'
            };
        }

        const response = paper.peer_review.responses.find(r => r.reviewerId === reviewerId);

        if (!response) {
            paper.peer_review.responses.push({
                _id: crypto.randomUUID(),
                reviewerId: reviewerId as User,
                status: 'accepted',
                responseDate: new Date(),
                assignedAt: new Date()
            });
            // Adiciona ao assignedReviewers se não estiver lá
            if (!paper.peer_review.assignedReviewers.some((r: User | string) => String(r) === reviewerId)) {
                paper.peer_review.assignedReviewers.push(reviewerId as User);
            }
        } else {
            response.status = 'accepted';
            response.responseDate = new Date();
            response.assignedAt = new Date();
            // Adiciona ao assignedReviewers se não estiver lá
            if (!paper.peer_review.assignedReviewers.some((r: User | string) => String(r) === reviewerId)) {
                paper.peer_review.assignedReviewers.push(reviewerId as User);
            }
        }

        const acceptedCount = paper.peer_review.responses.filter(
            r => r.status === 'accepted' || r.status === 'completed'
        ).length;

        if (acceptedCount >= 3) {
            paper.status = 'in review';
            paper.peer_review.reviewStatus = 'in_progress';
        }

        paper.updatedAt = new Date();
        await paper.save();

        // Buscar informações do revisor 
        const reviewer = await Users.findOne({ id: reviewerId });
        const authorId = typeof paper.mainAuthor === 'string' ? paper.mainAuthor : String(paper.mainAuthor);
        const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Revisor';
        const submittedById = typeof paper.submittedBy === 'string' ? paper.submittedBy : String(paper.submittedBy);

        // Criar notificações para quando revisor aceita fazer a revisão
        try {
            await NotificationService.createReviewerAcceptedNotifications({
                paperId: paper.id,
                paperTitle: paper.title,
                reviewerId: reviewerId,
                reviewerName: reviewerName,
                authorId: authorId,
                editorId: submittedById, // usando submittedBy como fallback para editor
                hubId: typeof paper.hubId === 'string' ? paper.hubId : undefined
            });
        } catch (notificationError) {
            console.error('Error creating notifications:', notificationError);
            // Não falhar a operação principal por causa das notificações
        }

        return json({ success: true, paper }, { status: 200 });

    } catch (error) {
        console.error('Error accepting review:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
