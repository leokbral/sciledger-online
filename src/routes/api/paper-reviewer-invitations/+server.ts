import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import Invitations from '$lib/db/models/Invitation';
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
			const existingInvite = await Invitations.findOne({
				paper: paperId,
				reviewer: reviewerId,
				status: 'pending'
			});

			if (!existingInvite) {
				const invitation = new Invitations({
					id: crypto.randomUUID(),
					paper: paperId,
					reviewer: reviewerId,
					invitedBy: user.id,
					hubId: hubId,
					status: 'pending',
					invitedAt: new Date(),
					type: 'paper_review' // Novo tipo para diferenciar de convite para hub
				});

				await invitation.save();
				invitations.push(invitation);
			}
		}

		// Buscar informações dos revisores para notificações
		const reviewers = await Users.find({ id: { $in: reviewerIds } });

		// TODO: Criar notificações para os revisores convidados
		// await NotificationService.createPaperReviewInvitationNotifications({
		//     paperId,
		//     paperTitle: paper.title,
		//     reviewerIds,
		//     invitedBy: user.id
		// });

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
