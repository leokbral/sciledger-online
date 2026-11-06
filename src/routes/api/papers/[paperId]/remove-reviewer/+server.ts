import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Reviews from '$lib/db/models/Review';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitEvent } from '$lib/services/EventService';
import { getPaperAuthorAliases } from '$lib/server/reviewConflictOfInterest';

function reviewerIdOf(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') {
		const ref = value as { _id?: unknown; id?: unknown };
		return String(ref._id ?? ref.id ?? '');
	}
	return '';
}

export async function POST({ params, request, locals }) {
	try {
		await start_mongo();

		const { reviewerId: requestedReviewerId } = await request.json();
		const { paperId } = params;
		const reviewerId = reviewerIdOf(requestedReviewerId).trim();

		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
		if (!paperId || !reviewerId) {
			return json({ error: 'Paper ID and reviewer ID are required' }, { status: 400 });
		}

		const paper = await Papers.findOne({ $or: [{ id: paperId }, { _id: paperId }] });
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

		const canonicalPaperId = String(paper._id);
		const isAssigned =
			(paper.reviewers ?? []).some((reviewer: unknown) => reviewerIdOf(reviewer) === reviewerId) ||
			(paper.peer_review?.assignedReviewers ?? []).some(
				(reviewer: unknown) => reviewerIdOf(reviewer) === reviewerId
			) ||
			(paper.peer_review?.responses ?? []).some(
				(response: { reviewerId?: unknown }) => reviewerIdOf(response.reviewerId) === reviewerId
			) ||
			(paper.reviewSlots ?? []).some(
				(slot: { reviewerId?: unknown }) => reviewerIdOf(slot.reviewerId) === reviewerId
			);
		if (!isAssigned) {
			return json({ error: 'Reviewer is not assigned to this paper' }, { status: 404 });
		}

		const hasSubmittedReview =
			(paper.peer_review?.responses ?? []).some(
				(response: { reviewerId?: unknown; status?: string }) =>
					reviewerIdOf(response.reviewerId) === reviewerId && response.status === 'completed'
			) || (await Reviews.exists({ paperId: canonicalPaperId, reviewerId }));
		if (hasSubmittedReview) {
			return json(
				{ error: 'A reviewer with a submitted review cannot be removed' },
				{ status: 409 }
			);
		}

		paper.reviewers = (paper.reviewers ?? []).filter(
			(reviewer: unknown) => reviewerIdOf(reviewer) !== reviewerId
		);
		if (paper.peer_review) {
			paper.peer_review.assignedReviewers = (paper.peer_review.assignedReviewers ?? []).filter(
				(reviewer: unknown) => reviewerIdOf(reviewer) !== reviewerId
			);
			paper.peer_review.responses = (paper.peer_review.responses ?? []).filter(
				(response: { reviewerId?: unknown }) => reviewerIdOf(response.reviewerId) !== reviewerId
			);
		}
		for (const slot of paper.reviewSlots ?? []) {
			if (reviewerIdOf(slot.reviewerId) !== reviewerId) continue;
			slot.reviewerId = null;
			slot.status = 'available';
			slot.invitedAt = undefined;
			slot.acceptedAt = undefined;
			slot.declinedAt = undefined;
		}
		if (paper.reviewSlots?.length) {
			paper.availableSlots = paper.reviewSlots.filter(
				(slot: { status?: string }) => slot.status === 'available' || slot.status === 'declined'
			).length;
		}
		await paper.save();

		await ReviewQueue.deleteMany({ paperId: canonicalPaperId, reviewer: reviewerId });
		await ReviewAssignment.updateMany(
			{ paperId: canonicalPaperId, reviewerId, status: { $ne: 'completed' } },
			{ $set: { status: 'removed', updatedAt: new Date() } }
		);
		await PaperReviewInvitation.updateMany(
			{
				$and: [
					{ $or: [{ paperId: canonicalPaperId }, { paper: canonicalPaperId }] },
					{ $or: [{ reviewerId }, { reviewer: reviewerId }] }
				],
				status: 'pending'
			},
			{ $set: { status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() } }
		);

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
				entityId: canonicalPaperId,
				metadata: {
					paperId: canonicalPaperId,
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
	} catch (error) {
		console.error('Error removing reviewer:', error);
		return json(
			{
				error: 'Failed to remove reviewer',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}
