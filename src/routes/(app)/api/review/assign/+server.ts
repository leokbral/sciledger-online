import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/mongo';
// import { db } from '$lib/db'; // Ajuste para seu arquivo de conexão MongoDB

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { paperId, reviewerIds, peerReviewType } = await request.json();

        // Cria as atribuições de revisão
        const reviewAssignments = reviewerIds.map((reviewerId: string) => ({
            paperId: paperId,
            reviewerId: reviewerId,
            status: 'pending',
            peerReviewType,
            assignedAt: new Date(),
            completedAt: null
        }));

        // Insere na collection review_queue
        await db.collection('reviewqueue').insertMany(reviewAssignments);

        // Atualiza o status do paper
        await db.collection('papers').updateOne(
            { _id: paperId },
            { 
                $set: { 
                    status: 'in review',
                    reviewers: reviewerIds
                }
            }
        );

        return json({ success: true });
    } catch (error) {
        console.error('Error assigning reviewers:', error);
        return json({ success: false, error: 'Failed to assign reviewers' }, { status: 500 });
    }
};