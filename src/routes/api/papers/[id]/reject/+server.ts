import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { NotificationService } from '$lib/services/NotificationService';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();

    try {
        const { rejectionReason } = await request.json();

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

        if (hub.createdBy.toString() !== locals.user.id) {
            return json({ error: 'Only hub administrator can reject papers' }, { status: 403 });
        }

        // Update paper with rejection
        paper.status = 'rejected';
        paper.rejectedByHub = true;
        paper.rejectionReason = rejectionReason;
        paper.rejectedAt = new Date();
        paper.rejectedBy = locals.user.id;
        await paper.save();

        // Create notification for the paper author
        const submitterId = typeof paper.submittedBy === 'object' 
            ? paper.submittedBy._id || paper.submittedBy.id 
            : paper.submittedBy;

        await NotificationService.createNotification({
            user: submitterId,
            type: 'paper_rejected',
            title: 'Paper Rejected',
            content: `Your paper "${paper.title}" was rejected by ${hub.title}. Reason: ${rejectionReason}`,
            relatedPaperId: paper.id,
            actionUrl: `/publish/edit/${paper.id}`,
            priority: 'high'
        });

        // Also notify main author if different from submitter
        const mainAuthorId = typeof paper.mainAuthor === 'object'
            ? paper.mainAuthor._id || paper.mainAuthor.id
            : paper.mainAuthor;

        if (mainAuthorId !== submitterId) {
            await NotificationService.createNotification({
                user: mainAuthorId,
                type: 'paper_rejected',
                title: 'Paper Rejected',
                content: `The paper "${paper.title}" was rejected by ${hub.title}. Reason: ${rejectionReason}`,
                relatedPaperId: paper.id,
                actionUrl: `/publish/edit/${paper.id}`,
                priority: 'high'
            });
        }

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
        console.error('Error rejecting paper:', error);
        return json({ 
            error: 'Failed to reject paper',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
