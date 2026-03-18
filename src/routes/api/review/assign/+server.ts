import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Users from '$lib/db/models/User';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, reviewerIds, peerReviewType } = await request.json();

		if (!paperId || !reviewerIds || !Array.isArray(reviewerIds)) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		// Buscar o paper
		const paper = await Papers.findOne({ id: paperId });
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
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
		for (const reviewerId of reviewerIds) {
			// Verificar se o revisor existe
			const reviewer = await Users.findOne({ $or: [{ id: reviewerId }, { _id: reviewerId }] });
			if (!reviewer) {
				console.warn(`Reviewer ${reviewerId} not found`);
				continue;
			}

			// Verificar se já existe convite pendente
			const existingInvite = await PaperReviewInvitation.findOne({
				paper: paperId,
				reviewer: reviewerId,
				status: 'pending'
			});

			if (!existingInvite) {
				const invitation = new PaperReviewInvitation({
					_id: crypto.randomUUID(),
					id: crypto.randomUUID(),
					paper: paperId,
					reviewer: reviewerId,
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
						reviewerId: reviewer.id,
						paperId: paper.id,
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
