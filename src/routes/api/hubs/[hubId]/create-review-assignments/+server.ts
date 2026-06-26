import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitEvent } from '$lib/services/EventService';
import {
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from '$lib/server/reviewConflictOfInterest';
import type { RequestHandler } from './$types';
import * as crypto from 'crypto';

function normalizeId(value: any): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return String(value);
}

export const POST: RequestHandler = async ({ params, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { hubId } = params;

		// Verificar se o usuário é o dono do hub
		const hub = await Hubs.findById(hubId);
		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const authorization = await authorize(user, 'review.assign', { hub });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		// Importar ReviewAssignment dinamicamente
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;

		// Buscar todos os papers deste hub
		const papers = await Papers.find({ 
			hubId: hubId,
			reviewers: { $exists: true, $ne: [] }
		}).lean();

		let createdCount = 0;
		const skipped: Array<{ paperId: string; reviewerId: string; reasons: string[] }> = [];

		// Para cada paper, verificar revisores e criar ReviewAssignments se não existirem
		for (const paper of papers) {
			if (!paper.reviewers || paper.reviewers.length === 0) continue;

			for (const reviewerId of paper.reviewers) {
				const reviewer = await Users.findOne({
					$or: [{ id: String(reviewerId) }, { _id: String(reviewerId) }]
				}).lean();
				const conflictValidation = validateReviewerCanReviewPaper(paper, reviewer || reviewerId);
				if (!conflictValidation.allowed) {
					skipped.push({
						paperId: String(paper.id || paper._id),
						reviewerId: String(reviewerId),
						reasons: [REVIEW_CONFLICT_OF_INTEREST_MESSAGE]
					});
					continue;
				}

				// Verificar se já existe ReviewAssignment
				const existing = await ReviewAssignment.findOne({
					paperId: paper.id,
					reviewerId: reviewerId
				});

				if (!existing) {
					// Criar ReviewAssignment
					const assignmentId = crypto.randomUUID();
					const now = new Date();
					const deadline = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 dias padrão

					const reviewAssignment = await ReviewAssignment.create({
						_id: assignmentId,
						id: assignmentId,
						paperId: paper.id,
						reviewerId: reviewerId,
						status: 'accepted',
						assignedAt: now,
						acceptedAt: now,
						deadline: deadline,
						hubId: hubId,
						isLinkedToHub: true
					});

					const actorId = normalizeId(user);
					const normalizedReviewerId = normalizeId(reviewerId);
					const recipients = [...new Set([normalizedReviewerId, actorId].filter(Boolean))];

					if (recipients.length > 0) {
						try {
							await emitEvent({
								type: 'review.assignment.created',
								actorId,
								recipients,
								entityType: 'review',
								entityId: normalizeId(reviewAssignment.id) || normalizeId(reviewAssignment._id) || assignmentId,
								metadata: {
									reviewAssignmentId:
										normalizeId(reviewAssignment.id) || normalizeId(reviewAssignment._id) || assignmentId,
									paperId: String(paper.id),
									paperTitle: paper.title || 'Untitled paper',
									hubId,
									hubName: hub.title || hub.name || 'SciLedger hub',
									reviewerId: normalizedReviewerId,
									editorId: actorId,
									deadline: deadline.toISOString(),
									source: 'hub_create_review_assignments',
									recipientRoles: Object.fromEntries(
										recipients.map((recipientId) => [
											recipientId,
											recipientId === normalizedReviewerId ? 'reviewer' : 'editor'
										])
									)
								}
							});
						} catch (eventError) {
							console.error('Failed to emit review assignment created event:', eventError);
						}
					}

					createdCount++;
				}
			}
		}

		return json({
			success: true,
			created: createdCount,
			skipped,
			message: `Successfully created ${createdCount} review assignment(s)`
		});
	} catch (error) {
		console.error('Error creating review assignments:', error);
		return json({ error: 'Failed to create review assignments' }, { status: 500 });
	}
};
