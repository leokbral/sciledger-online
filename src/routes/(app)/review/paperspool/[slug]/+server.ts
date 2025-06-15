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

        // Update paper with new reviewer and status
        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            {
                $addToSet: { reviewers: reviewerId }, // Add reviewer if not already present
                status: 'in review',
                updatedAt: new Date().toISOString()
            },
            { new: true }
        );

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        console.error('Error accepting review:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
