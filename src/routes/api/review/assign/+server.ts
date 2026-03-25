import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Users from '$lib/db/models/User';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, reviewerIds, reviewerId, peerReviewType } = await request.json();
		const normalizedReviewerIds: string[] = Array.isArray(reviewerIds)
			? reviewerIds.filter(Boolean).map((id: string) => String(id))
			: reviewerId
				? [String(reviewerId)]
				: [];

		if (!paperId || normalizedReviewerIds.length === 0) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		// Buscar o paper
		const paper = await Papers.findOne({ $or: [{ id: paperId }, { _id: paperId }] });
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const isStandalonePaper = !paper.hubId;
		const hasAuthorizedPaymentHold =
			!!paper.paymentHold?.stripePaymentIntentId &&
			(paper.paymentHold?.status === 'authorized' || paper.paymentHold?.status === 'captured');

		if (isStandalonePaper && !hasAuthorizedPaymentHold) {
			return json(
				{ error: 'Payment authorization is required before inviting reviewers for standalone papers.' },
				{ status: 403 }
			);
		}

		// Verificar se é o autor do paper
		const mainAuthorId = typeof paper.mainAuthor === 'object' 
			? (paper.mainAuthor._id || paper.mainAuthor.id) 
			: paper.mainAuthor;
		const correspondingAuthorId = typeof paper.correspondingAuthor === 'object'
			? (paper.correspondingAuthor._id || paper.correspondingAuthor.id)
			: paper.correspondingAuthor;
		const submittedById = typeof paper.submittedBy === 'object'
			? (paper.submittedBy._id || paper.submittedBy.id)
			: paper.submittedBy;
		
		const isAuthor = 
			mainAuthorId?.toString() === user.id ||
			correspondingAuthorId?.toString() === user.id ||
			submittedById?.toString() === user.id;

		if (!isAuthor) {
			return json({ error: 'Only paper authors can assign reviewers' }, { status: 403 });
		}

		// Atualizar peer_review do paper
		if (!paper.peer_review) {
			paper.peer_review = {
				reviewType: peerReviewType || 'selected',
				responses: [],
				reviews: [],
				assignedReviewers: [],
				averageScore: 0,
				reviewCount: 0,
				reviewStatus: 'not_started'
			};
		} else {
			paper.peer_review.reviewType = peerReviewType || paper.peer_review.reviewType;
		}

		// Criar convites para cada revisor
		const invitations = [];
		for (const rawReviewerId of normalizedReviewerIds) {
			// Verificar se o revisor existe
			const reviewer = await Users.findOne({ $or: [{ id: rawReviewerId }, { _id: rawReviewerId }] });
			if (!reviewer) {
				console.warn(`Reviewer ${rawReviewerId} not found`);
				continue;
			}

			const normalizedReviewerId = String(reviewer.id || reviewer._id);
			const normalizedPaperId = String(paper.id || paper._id);

			// Verificar se já existe convite pendente
			const existingInvite = await PaperReviewInvitation.findOne({
				paper: normalizedPaperId,
				reviewer: normalizedReviewerId,
				status: 'pending'
			});

			if (!existingInvite) {
				const invitationId = randomUUID();
				const invitation = new PaperReviewInvitation({
					_id: invitationId,
					id: invitationId,
					paper: normalizedPaperId,
					reviewer: normalizedReviewerId,
					invitedBy: user.id,
					status: 'pending',
					invitedAt: new Date(),
					hubId: paper.hubId || null
				});

				await invitation.save();
				invitations.push(invitation);

				// Criar notificação para o revisor
				try {
					await NotificationService.createPaperReviewRequest({
						reviewerId: normalizedReviewerId,
						paperId: normalizedPaperId,
						paperTitle: paper.title,
						authorName: `${user.firstName} ${user.lastName}`
					});
				} catch (notifyError) {
					console.error('Failed to create notification:', notifyError);
					// Não falha se notificação não puder ser criada
				}
			}
		}

		paper.updatedAt = new Date();
		await paper.save();

		return json({
			success: true,
			message: `Successfully sent ${invitations.length} invitation(s)`,
			invitations: invitations.length
		});
	} catch (error) {
		console.error('Error assigning reviewers:', error);
		return json(
			{ error: 'Failed to assign reviewers', details: (error as Error).message, success: false },
			{ status: 500 }
		);
	}
};
