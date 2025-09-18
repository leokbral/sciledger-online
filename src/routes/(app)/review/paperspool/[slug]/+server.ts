import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import '$lib/db/models/User';

export const POST: RequestHandler = async ({ request }) => {
    await start_mongo();

    try {
        const { paperId, reviewerId } = await request.json();

        if (!paperId || !reviewerId) {
            return json({ error: 'Paper ID and reviewer ID are required.' }, { status: 400 });
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
                reviewerId,
                status: 'accepted',
                responseDate: new Date(),
                assignedAt: new Date(),
                _id: undefined
            });
            // Adiciona ao assignedReviewers se não estiver lá
            if (!paper.peer_review.assignedReviewers.includes(reviewerId)) {
                paper.peer_review.assignedReviewers.push(reviewerId);
            }
        } else {
            response.status = 'accepted';
            response.responseDate = new Date();
            response.assignedAt = new Date();
            // Adiciona ao assignedReviewers se não estiver lá
            if (!paper.peer_review.assignedReviewers.includes(reviewerId)) {
                paper.peer_review.assignedReviewers.push(reviewerId);
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

        return json({ success: true, paper }, { status: 200 });


    } catch (error) {
        console.error('Error accepting review:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
