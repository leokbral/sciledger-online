import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import ReviewQueue from '$lib/db/models/ReviewQueue';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { inviteId } = params;
		const { action } = await request.json();

		if (!action || !['accept', 'decline'].includes(action)) {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		// Buscar o convite
		const invitation = await PaperReviewInvitation.findOne({ 
			$or: [{ _id: inviteId }, { id: inviteId }] 
		})
		.populate('paper')
		.populate('invitedBy')
		.populate('reviewer');

		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		// Verificar se o usuário é o revisor convidado
		const reviewerId = typeof invitation.reviewer === 'object' 
			? (invitation.reviewer._id || invitation.reviewer.id) 
			: invitation.reviewer;

		if (reviewerId.toString() !== user.id) {
			return json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Atualizar status do convite
		invitation.status = action === 'accept' ? 'accepted' : 'declined';
		invitation.respondedAt = new Date();
		await invitation.save();

		const paper = typeof invitation.paper === 'object' ? invitation.paper : await Papers.findOne({ id: invitation.paper });
		const invitedBy = typeof invitation.invitedBy === 'object' ? invitation.invitedBy : await Users.findOne({ id: invitation.invitedBy });

		if (action === 'accept') {
			// Criar entrada na ReviewQueue para o revisor poder revisar o paper
			const queueId = crypto.randomUUID();
			const reviewQueueEntry = new ReviewQueue({
				_id: queueId,
				id: queueId,
				paperId: typeof paper === 'object' ? paper.id : paper,
				reviewer: user.id,
				peerReviewType: 'selected',
				hubId: invitation.hubId,
				isLinkedToHub: true,
				status: 'accepted',
				assignedAt: new Date()
			});

			await reviewQueueEntry.save();

			// Adicionar revisor ao campo reviewers do Paper
			const paperDoc = await Papers.findOne({ id: typeof paper === 'object' ? paper.id : paper });
			if (paperDoc) {
				console.log('📄 Paper found:', paperDoc.id, 'Status:', paperDoc.status);
				console.log('👤 Adding reviewer:', user.id, '(type:', typeof user.id, ')');
				console.log('📋 Current reviewers:', paperDoc.reviewers, '(types:', paperDoc.reviewers?.map(r => typeof r));
				
				if (!paperDoc.reviewers) {
					paperDoc.reviewers = [];
				}
				if (!paperDoc.reviewers.includes(user.id)) {
					paperDoc.reviewers.push(user.id);
					await paperDoc.save();
					
					// Verificar se realmente salvou
					const verifyPaper = await Papers.findOne({ id: paperDoc.id }).lean();
					console.log('✅ Reviewer added successfully.');
					console.log('🔍 Verification - Paper reviewers in DB:', verifyPaper?.reviewers);
				} else {
					console.log('ℹ️ Reviewer already in list');
				}
			} else {
				console.error('❌ Paper not found for ID:', typeof paper === 'object' ? paper.id : paper);
			}

			// Notificar o criador do hub que o revisor aceitou
			if (invitedBy) {
				await NotificationService.createNotification({
					user: String(invitedBy._id || invitedBy.id),
					type: 'reviewer_accepted_review',
					title: 'Reviewer Accepted Paper Review',
					content: `${user.firstName} ${user.lastName} accepted the invitation to review "${paper?.title}"`,
					relatedPaperId: typeof paper === 'object' ? paper.id : paper,
					relatedHubId: String(invitation.hubId),
					actionUrl: `/notifications`,
					priority: 'medium',
					metadata: {
						reviewerName: `${user.firstName} ${user.lastName}`,
						reviewerId: user.id,
						paperTitle: paper?.title
					}
				});
			}
		} else {
			// Notificar o criador do hub que o revisor recusou
			if (invitedBy) {
				await NotificationService.createNotification({
					user: String(invitedBy._id || invitedBy.id),
					type: 'reviewer_declined_review',
					title: 'Reviewer Declined Paper Review',
					content: `${user.firstName} ${user.lastName} declined the invitation to review "${paper?.title}"`,
					relatedPaperId: typeof paper === 'object' ? paper.id : paper,
					relatedHubId: String(invitation.hubId),
					actionUrl: `/paper/${typeof paper === 'object' ? paper.id : paper}`,
					priority: 'low',
					metadata: {
						reviewerName: `${user.firstName} ${user.lastName}`,
						reviewerId: user.id,
						paperTitle: paper?.title
					}
				});
			}
		}

		return json({ 
			success: true,
			action,
			message: action === 'accept' 
				? 'You accepted the review invitation. The paper is now available for you to review.'
				: 'You declined the review invitation.'
		});
	} catch (error) {
		console.error('Error responding to paper review invitation:', error);
		return json({ error: 'Failed to process invitation response' }, { status: 500 });
	}
};
