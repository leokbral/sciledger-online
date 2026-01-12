import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, reviewerId } = await request.json();

		if (!paperId || !reviewerId) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		// Buscar o paper
		const paper = await Papers.findOne({ id: paperId }).populate('hubId');
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Verificar se o usuário é o dono do hub
		const hubCreatorId = typeof paper.hubId === 'object'
			? (paper.hubId?.createdBy?._id || paper.hubId?.createdBy?.id || paper.hubId?.createdBy)
			: null;
		
		if (hubCreatorId?.toString() !== user.id) {
			return json({ error: 'Only hub owner can remove reviewers' }, { status: 403 });
		}

		// Encontrar o slot do revisor
		const reviewerSlot = paper.reviewSlots?.find(
			slot => slot.reviewerId?.toString() === reviewerId
		);

		if (!reviewerSlot) {
			return json({ error: 'Reviewer not found in any slot' }, { status: 404 });
		}

		// Liberar o slot
		reviewerSlot.reviewerId = null;
		reviewerSlot.status = 'available';
		reviewerSlot.acceptedAt = undefined;
		reviewerSlot.declinedAt = undefined;
		reviewerSlot.invitedAt = undefined;

		// Atualizar contador de slots disponíveis
		if (paper.reviewSlots) {
			paper.availableSlots = paper.reviewSlots.filter(
				slot => slot.status === 'available' || slot.status === 'declined'
			).length;
		}

		// Remover revisor da lista de reviewers
		paper.reviewers = paper.reviewers.filter(
			(id: string | { toString(): string }) => String(id) !== reviewerId
		);

		// Remover da peer_review.responses
		if (paper.peer_review && Array.isArray(paper.peer_review.responses)) {
			paper.peer_review.responses = paper.peer_review.responses.filter(
				(r: { reviewerId?: string | { toString(): string } }) => String(r.reviewerId) !== reviewerId
			);
		}

		// Remover da peer_review.assignedReviewers
		if (paper.peer_review && Array.isArray(paper.peer_review.assignedReviewers)) {
			paper.peer_review.assignedReviewers = paper.peer_review.assignedReviewers.filter(
				(r: string | { toString(): string }) => String(r) !== reviewerId
			);
		}

		await paper.save();

		// Remover entradas relacionadas no ReviewQueue
		await ReviewQueue.deleteMany({
			paperId: paperId,
			reviewer: reviewerId
		});

		// Atualizar ReviewAssignment para 'removed'
		const ReviewAssignmentModel = (await import('$lib/db/models/ReviewAssignment')).default;
		await ReviewAssignmentModel.updateMany(
			{ paperId: paperId, reviewerId: reviewerId },
			{ 
				$set: { 
					status: 'removed',
					removedAt: new Date()
				} 
			}
		);

		// Notificar o revisor que foi removido
		const reviewer = await Users.findOne({ id: reviewerId });
		if (reviewer) {
			await NotificationService.createNotification({
				user: String(reviewerId),
				type: 'paper_accepted_for_review',
				title: 'Removed from Paper Review',
				content: `You have been removed from reviewing the paper "${paper.title}"`,
				relatedPaperId: paperId,
				actionUrl: `/review`,
				priority: 'medium',
				metadata: {
					paperTitle: paper.title,
					removedBy: user.id,
					removedByName: `${user.firstName} ${user.lastName}`
				}
			});
		}

		return json({ 
			success: true,
			message: 'Reviewer removed and slot freed successfully',
			availableSlots: paper.availableSlots,
			maxSlots: paper.maxReviewSlots || 3
		});
	} catch (error) {
		console.error('Error removing reviewer:', error);
		return json({ error: 'Failed to remove reviewer' }, { status: 500 });
	}
};
