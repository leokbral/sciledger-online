import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import {
    EditorialTransitionError,
    transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();

    try {
        const { rejectionReason, expectedStatus } = await request.json();

        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        // Find the paper
        const paper = await Papers.findById(params.id);
        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Verify the user is the hub admin
        if (!paper.hubId) {
            return json({ error: 'This paper is not linked to a hub' }, { status: 400 });
        }

        const hub = await Hubs.findById(paper.hubId);
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        const updatedPaper: any = await transitionPaperStatus({
            user: locals.user,
            paperId: String(paper.id || paper._id),
            action: 'paper.reject',
            expectedStatus: expectedStatus || paper.status,
            extraSet: {
                rejectedByHub: true,
                rejectionReason,
                rejectedAt: new Date(),
                rejectedBy: locals.user.id
            },
            metadata: {
                endpoint: '/api/papers/[id]/reject',
                rejectionReason
            }
        });
        paper.status = updatedPaper.status;
        paper.rejectionReason = rejectionReason;

        return json({
            success: true, 
            message: 'Paper rejected successfully',
            paper: {
                id: paper.id,
                status: paper.status,
                rejectionReason: paper.rejectionReason
            }
        });
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
        console.error('Error rejecting paper:', error);
        return json({ 
            error: 'Failed to reject paper',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
