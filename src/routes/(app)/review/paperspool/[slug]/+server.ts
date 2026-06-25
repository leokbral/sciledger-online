import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import { emitEvent } from '$lib/services/EventService';
import type { User } from '$lib/types/User';
import * as crypto from 'crypto';
import {
    EditorialTransitionError,
    transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';
import { getUserIdAliases } from '$lib/server/authorization/roleResolver';

function normalizeId(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value.id) return String(value.id);
    if (value._id) return String(value._id);
    return String(value);
}

function displayName(user: any, fallback: string) {
    return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || fallback;
}

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

        if (!getUserIdAliases(user).includes(String(reviewerId))) {
            return json({ error: 'Reviewer mismatch' }, { status: 403 });
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

        const response = paper.peer_review.responses.find((r: any) => r.reviewerId === reviewerId);
        const wasAlreadyAccepted = response?.status === 'accepted' || response?.status === 'completed';

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

        // Adicionar revisor ao campo reviewers do paper (permite acesso individual)
        if (!paper.reviewers) {
            paper.reviewers = [];
        }
        if (!paper.reviewers.includes(reviewerId)) {
            paper.reviewers.push(reviewerId);
        }

        // Criar ReviewQueue para o revisor (permite acesso individual)
        const existingQueue = await ReviewQueue.findOne({
            paperId: paperId,
            reviewer: reviewerId
        });

        if (!existingQueue) {
            const queueId = crypto.randomUUID();
            const reviewQueueEntry = new ReviewQueue({
                _id: queueId,
                id: queueId,
                paperId: paperId,
                reviewer: reviewerId,
                peerReviewType: 'selected',
                hubId: typeof paper.hubId === 'string' ? paper.hubId : undefined,
                isLinkedToHub: !!paper.hubId,
                status: 'accepted',
                assignedAt: new Date()
            });
            await reviewQueueEntry.save();
        }

        // Criar ReviewAssignment (permite acesso individual com deadline)
        const existingAssignment = await ReviewAssignment.findOne({
            paperId: paperId,
            reviewerId: reviewerId
        });
        let reviewAssignmentId = normalizeId(existingAssignment?.id) || normalizeId(existingAssignment?._id);
        let reviewAssignmentDeadline: Date | null = existingAssignment?.deadline || null;

        if (!existingAssignment) {
            const deadlineDays = 15; // Default 15 dias
            const acceptedAt = new Date();
            const deadline = new Date(acceptedAt.getTime() + deadlineDays * 24 * 60 * 60 * 1000);

            const assignmentId = crypto.randomUUID();
            const reviewAssignment = new ReviewAssignment({
                _id: assignmentId,
                id: assignmentId,
                paperId: paperId,
                reviewerId: reviewerId,
                status: 'accepted',
                assignedAt: new Date(),
                acceptedAt: acceptedAt,
                deadline: deadline,
                hubId: typeof paper.hubId === 'string' ? paper.hubId : undefined,
                isLinkedToHub: !!paper.hubId
            });
            await reviewAssignment.save();
            reviewAssignmentId = assignmentId;
            reviewAssignmentDeadline = deadline;
        }

        const acceptedCount = paper.peer_review.responses.filter(
            (r: any) => r.status === 'accepted' || r.status === 'completed'
        ).length;

        const shouldSendToReview = acceptedCount >= 1 && paper.status === 'reviewer assignment';

        paper.updatedAt = new Date();
        await paper.save();

        if (shouldSendToReview) {
            try {
                await transitionPaperStatus({
                    paperId,
                    action: 'paper.sendToReview',
                    expectedStatus: 'reviewer assignment',
                    system: true,
                    metadata: {
                        endpoint: '/review/paperspool/[slug]',
                        trigger: 'legacy_reviewer_acceptance'
                    }
                });
                paper.status = 'in review';
            } catch (transitionError) {
                if (transitionError instanceof EditorialTransitionError) {
                    console.warn('Paperspool status transition skipped:', transitionError.message);
                } else {
                    throw transitionError;
                }
            }
        }

        // Buscar informações do revisor 
        const reviewer = await Users.findOne({ id: reviewerId }).lean();
        const authorId = normalizeId(paper.mainAuthor);
        const reviewerName = displayName(reviewer, 'Reviewer');
        const submittedById = normalizeId(paper.submittedBy);
        const recipients = [...new Set([reviewerId, submittedById].filter(Boolean))];

        if (!wasAlreadyAccepted && recipients.length > 0) {
            try {
                await emitEvent({
                    type: 'review.assignment.created',
                    actorId: reviewerId,
                    recipients,
                    entityType: 'review',
                    entityId: reviewAssignmentId || String(paper.id),
                    metadata: {
                        reviewAssignmentId,
                        paperId: String(paper.id),
                        paperTitle: paper.title || 'Untitled paper',
                        hubId: typeof paper.hubId === 'string' ? paper.hubId : null,
                        reviewerId,
                        reviewerName,
                        authorId,
                        editorId: submittedById,
                        deadline: reviewAssignmentDeadline?.toISOString(),
                        source: 'legacy_paperspool_accept',
                        recipientRoles: Object.fromEntries(
                            recipients.map((recipientId) => [
                                recipientId,
                                recipientId === reviewerId ? 'reviewer' : 'editor'
                            ])
                        )
                    }
                });
            } catch (eventError) {
                console.error('Failed to emit paperspool review assignment event:', eventError);
            }
        }

        return json({ success: true, paper }, { status: 200 });

    } catch (error) {
        console.error('Error accepting review:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};
