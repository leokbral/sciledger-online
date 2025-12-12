import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, hubId, reviewerIds } = await request.json();

		if (!paperId || !hubId || !reviewerIds || !Array.isArray(reviewerIds)) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		// Verificar se o usuário é o dono do hub
		const paper = await Papers.findOne({ id: paperId }).populate('hubId');
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const hubCreatorId = typeof paper.hubId === 'object'
			? (paper.hubId?.createdBy?._id || paper.hubId?.createdBy?.id || paper.hubId?.createdBy)
			: null;
		
		if (hubCreatorId?.toString() !== user.id) {
			return json({ error: 'Only hub owner can invite reviewers' }, { status: 403 });
		}

		// Criar convites para cada revisor
		const invitations = [];
		for (const reviewerId of reviewerIds) {
			// Verificar se já existe convite pendente
			const existingInvite = await PaperReviewInvitation.findOne({
				paper: paperId,
				reviewer: reviewerId,
				status: 'pending'
			});

			if (!existingInvite) {
				const inviteId = crypto.randomUUID();
				const invitation = new PaperReviewInvitation({
					_id: inviteId,
					id: inviteId,
					paper: paperId,
					reviewer: reviewerId,
					invitedBy: user.id,
					hubId: hubId,
					status: 'pending',
					invitedAt: new Date()
				});

				await invitation.save();
				invitations.push(invitation);

				// Criar notificação para o revisor
				const reviewer = await Users.findOne({ id: reviewerId });
				if (reviewer) {
					await NotificationService.createNotification({
						user: String(reviewerId),
						type: 'review_request',
						title: 'New Paper Review Request',
						content: `You have been invited to review the paper "${paper.title}"`,
						relatedPaperId: paperId,
						relatedHubId: hubId,
						actionUrl: `/notifications?inviteId=${inviteId}`,
						priority: 'high',
						metadata: {
							paperId,
							paperTitle: paper.title,
							invitedBy: user.id,
							invitedByName: `${user.firstName} ${user.lastName}`,
							inviteId: inviteId,
							inviteType: 'paper_review'
						}
					});
				}
			}
		}

		return json({
			success: true,
			invitations: invitations.length,
			message: `Successfully invited ${invitations.length} reviewer(s)`
		});
	} catch (error) {
		console.error('Error creating paper review invitations:', error);
		return json(
			{ error: 'Failed to create invitations' },
			{ status: 500 }
		);
	}
};
