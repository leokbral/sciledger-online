import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitEvent } from '$lib/services/EventService';
import { getPaperAuthorAliases } from '$lib/server/reviewConflictOfInterest';

export async function POST({ params, request, locals }) {
    try {
        await start_mongo();

        const { reviewerId } = await request.json();
        const { paperId } = params;

        if (!locals.user) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar o paper
        const paper = await Papers.findOne({ id: paperId });
        if (!paper) {
            return json({ error: 'Paper not found' }, { status: 404 });
        }

        // Verificar se o paper já foi publicado
        if (paper.status === 'published') {
            return json({ error: 'Cannot remove reviewers from published papers' }, { status: 400 });
        }

        const authorization = await authorize(locals.user, 'paper.assignReviewers', { paper });
        if (!authorization.allowed) {
            return json(
                { error: 'Insufficient permissions', reason: authorization.reason },
                { status: 403 }
            );
        }

        // Remover o revisor do array
        if (paper.reviewers && paper.reviewers.some((reviewer: unknown) => String(reviewer) === String(reviewerId))) {
            paper.reviewers = paper.reviewers.filter((reviewer: unknown) => String(reviewer) !== String(reviewerId));
            await paper.save();

            const actorId = String(locals.user.id || locals.user._id || '');
            const authorIds = getPaperAuthorAliases(paper).filter(
                (authorId) => authorId !== String(reviewerId) && authorId !== actorId
            );
            const recipients = [...new Set([String(reviewerId), actorId, ...authorIds].filter(Boolean))];
            const hubId = paper.hubId ? String(paper.hubId) : null;

            try {
                await emitEvent({
                    type: 'review.assignment.removed',
                    actorId,
                    recipients,
                    entityType: 'review',
                    entityId: String(paper.id || paper._id || paperId),
                    metadata: {
                        paperId: String(paper.id || paper._id || paperId),
                        paperTitle: paper.title,
                        hubId,
                        reviewerId: String(reviewerId),
                        reviewerName: String(reviewerId),
                        removedBy: actorId,
                        recipientRoles: Object.fromEntries(
                            recipients.map((recipientId) => [
                                recipientId,
                                recipientId === String(reviewerId)
                                    ? 'reviewer'
                                    : authorIds.includes(recipientId)
                                        ? 'author'
                                        : 'editor'
                            ])
                        )
                    }
                });
            } catch (eventError) {
                console.error('Failed to emit review assignment removed event:', eventError);
            }

            return json({
                success: true,
                message: 'Reviewer removed successfully',
                reviewers: paper.reviewers
            });
        } else {
            return json({ error: 'Reviewer not found in paper' }, { status: 404 });
        }

    } catch (error) {
        console.error('Error removing reviewer:', error);
        return json({ 
            error: 'Failed to remove reviewer',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
