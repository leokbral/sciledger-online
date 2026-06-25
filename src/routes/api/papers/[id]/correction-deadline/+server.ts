import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitPaperLifecycleEvent } from '$lib/server/paperLifecycleEvents';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
    await start_mongo();

    try {
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { correctionDeadline, correctionAcceptedAt } = await request.json();
        const paperId = params.id;

        // Get current paper
        const currentPaper = await Papers.findOne({ id: paperId }).lean().exec();
        if (!currentPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        const authorization = await authorize(user, 'paper.requestCorrections', { paper: currentPaper });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
        }

        // Prepare update object
        const updateData: {
            updatedAt: Date;
            correctionDeadline?: Date;
            correctionAcceptedAt?: Date;
        } = {
            updatedAt: new Date()
        };

        // Update correction timing fields
        if (correctionDeadline) {
            updateData.correctionDeadline = new Date(correctionDeadline);
        }

        if (correctionAcceptedAt) {
            updateData.correctionAcceptedAt = new Date(correctionAcceptedAt);
        }

        // If only correctionAcceptedAt is provided, calculate the deadline
        if (correctionAcceptedAt && !correctionDeadline) {
            const startDate = new Date(correctionAcceptedAt);
            const deadline = new Date(startDate);
            deadline.setDate(deadline.getDate() + 15);
            updateData.correctionDeadline = deadline;
        }

        // If only deadline is provided, calculate the accepted date
        if (correctionDeadline && !correctionAcceptedAt && !currentPaper.correctionAcceptedAt) {
            const deadline = new Date(correctionDeadline);
            const acceptedDate = new Date(deadline);
            acceptedDate.setDate(acceptedDate.getDate() - 15);
            updateData.correctionAcceptedAt = acceptedDate;
        }

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            updateData,
            { new: true, runValidators: true }
        ).lean().exec();

        if (!updatedPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        try {
            await emitPaperLifecycleEvent('paper.correction_deadline.updated', updatedPaper, {
                actorId: user.id,
                editorIds: [user.id],
                metadata: {
                    endpoint: '/api/papers/[id]/correction-deadline',
                    deadline: updateData.correctionDeadline?.toISOString(),
                    previousDeadline: currentPaper.correctionDeadline
                        ? new Date(currentPaper.correctionDeadline).toISOString()
                        : null,
                    correctionAcceptedAt: updateData.correctionAcceptedAt?.toISOString()
                }
            });
        } catch (eventError) {
            console.error('Failed to emit correction deadline event:', eventError);
        }

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating correction deadline:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};

export const GET: RequestHandler = async ({ params, locals }) => {
    await start_mongo();

    try {
        const user = locals.user;
        if (!user) {
            return json({ error: 'User not authenticated' }, { status: 401 });
        }

        const paperId = params.id;

        const paper = await Papers.findOne({ id: paperId })
            .select('correctionAcceptedAt correctionDeadline correctionRequestedAt status mainAuthor correspondingAuthor submittedBy coAuthors authors hubId peer_review.responses')
            .lean()
            .exec();

        if (!paper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        const canEdit = await authorize(user, 'paper.edit', { paper });
        const canRequestCorrections = await authorize(user, 'paper.requestCorrections', { paper });
        const canReview = await authorize(user, 'review.submit', { paper });
        if (!canEdit.allowed && !canRequestCorrections.allowed && !canReview.allowed) {
            return json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Calculate deadline info if paper is in correction status
        let deadlineInfo = null;
        if (paper.status === 'needing corrections' || paper.status === 'under correction') {
            const now = new Date();
            
            if (paper.correctionDeadline) {
                const timeDifference = paper.correctionDeadline.getTime() - now.getTime();
                const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
                const hoursRemaining = Math.ceil(timeDifference / (1000 * 60 * 60));
                const isOverdue = timeDifference < 0;

                deadlineInfo = {
                    hasDeadline: true,
                    daysRemaining: isOverdue ? Math.abs(daysRemaining) : daysRemaining,
                    hoursRemaining: isOverdue ? Math.abs(hoursRemaining) : hoursRemaining,
                    isOverdue,
                    deadlineDate: paper.correctionDeadline,
                    correctionStartDate: paper.correctionAcceptedAt,
                    totalDays: 15
                };
            }
        }

        return json({ 
            success: true, 
            paper: {
                id: paper.id,
                status: paper.status,
                correctionAcceptedAt: paper.correctionAcceptedAt,
                correctionDeadline: paper.correctionDeadline,
                correctionRequestedAt: paper.correctionRequestedAt
            },
            deadlineInfo 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error getting correction deadline:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
