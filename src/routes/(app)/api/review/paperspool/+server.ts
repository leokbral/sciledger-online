import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { paperId, reviewerIds, peerReviewType } = await request.json();

        // Cria as atribuições de revisão
        const reviewAssignments = reviewerIds.map((reviewerId: string) => ({
            paperId: paperId,
            reviewerId: reviewerId,
            status: 'PENDING',
            peerReviewType,
            assignedAt: new Date(),
            completedAt: null
        }));

        // Insere na collection review_queue
        await db.collection('review_queue').insertMany(reviewAssignments);

        // Atualiza o status do paper
        await db.collection('papers').updateOne(
            { _id: paperId },
            { 
                $set: { 
                    status: 'UNDER_REVIEW',
                    assignedReviewers: reviewerIds
                }
            }
        );

        return json({ success: true });
    } catch (error) {
        console.error('Error assigning reviewers:', error);
        return json({ success: false, error: 'Failed to assign reviewers' }, { status: 500 });
    }
};