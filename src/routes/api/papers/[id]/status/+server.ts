import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

const STATUS_TO_ACTION: Record<string, string> = {
	'in review': 'paper.sendToReview',
	'needing corrections': 'paper.requestCorrections',
	'under correction': 'paper.requestCorrections',
	'accepted': 'paper.accept',
	'rejected': 'paper.reject',
	'published': 'paper.publish',
	'draft': 'paper.withdraw',
	'reviewer assignment': 'paper.requestPublication'
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
    await start_mongo();

    try {
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { status, action, expectedStatus, metadata } = await request.json();
        const paperId = params.id;

        if (!status) {
            return json({ error: 'Status is required.' }, { status: 400 });
        }

        const currentPaper = await Papers.findOne({
            $or: [{ id: paperId }, { _id: paperId }]
        }).lean().exec();

        if (!currentPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        let transitionAction = action || STATUS_TO_ACTION[String(status)];
        if (!action && String(status) === 'reviewer assignment' && String(currentPaper.status) === 'draft') {
            transitionAction = 'paper.submit';
        }

        if (!transitionAction) {
            return json({ error: 'Unsupported editorial status transition.' }, { status: 400 });
        }

        const updatedPaper = await transitionPaperStatus({
            user,
            paperId,
            action: transitionAction,
            expectedStatus: expectedStatus || String(currentPaper.status),
            metadata: {
                endpoint: '/api/papers/[id]/status',
                requestedStatus: status,
                ...(metadata ?? {})
            }
        });

        if (!updatedPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        if (error instanceof EditorialTransitionError) {
            return json(
                {
                    error: error.message,
                    code: error.code,
                    currentStatus: error.currentStatus
                },
                { status: error.status }
            );
        }
        console.error('Error updating paper status:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
