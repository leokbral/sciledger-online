import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import ReviewAssignment from '$lib/db/models/ReviewAssignment';
import Hubs from '$lib/db/models/Hub';
import { checkReviewerEligibility } from '$lib/helpers/reviewerEligibility';
import { NotificationService } from '$lib/services/NotificationService';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { paperId, hubId, reviewerIds, customDeadlineDays } = await request.json();

		if (!paperId || !hubId || !reviewerIds || !Array.isArray(reviewerIds)) {
			return json({ error: 'Invalid request data' }, { status: 400 });
		}

		// Validar prazo customizado (padrão 15 dias se não fornecido)
		const deadlineDays = customDeadlineDays && customDeadlineDays > 0 ? customDeadlineDays : 15;

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

		// Inicializar reviewSlots se não existir
		if (!paper.reviewSlots || paper.reviewSlots.length === 0) {
			paper.reviewSlots = [
				{ slotNumber: 1, reviewerId: null, status: 'available' },
				{ slotNumber: 2, reviewerId: null, status: 'available' },
				{ slotNumber: 3, reviewerId: null, status: 'available' }
			];
			paper.maxReviewSlots = 3;
			paper.availableSlots = 3;
			await paper.save();
		}

		// Verificar slots disponíveis (apenas para informação, não bloqueia convites)
		const availableSlotsList = paper.reviewSlots.filter(
			slot => slot.status === 'available' || slot.status === 'declined'
		);
		const availableSlotsCount = availableSlotsList.length;

		// Preparar dados de elegibilidade
		const hubReviewerIds: string[] = [];
		try {
			// Preferir a lista populada no próprio paper (evita confusão entre _id vs id)
			if (typeof paper.hubId === 'object' && (paper.hubId as any)?.reviewers) {
				hubReviewerIds.push(
					...(paper.hubId as any).reviewers.map((r: any) => String(r?._id || r?.id || r))
				);
			} else {
				// Fallback: buscar no banco
				const hubIdValue = typeof paper.hubId === 'object'
					? String((paper.hubId as any)._id || (paper.hubId as any).id)
					: String(paper.hubId);
				let hubDoc = await Hubs.findById(hubIdValue).lean();
				if (!hubDoc) {
					hubDoc = await Hubs.findOne({ id: hubIdValue }).lean();
				}
				if (hubDoc?.reviewers && Array.isArray(hubDoc.reviewers)) {
					hubReviewerIds.push(...hubDoc.reviewers.map((r: any) => String(r?._id || r?.id || r)));
				}
			}
		} catch (e) {
			// Falha ao carregar hub não impede convite, mas afeta verificação de elegibilidade
		}

		const alreadyAssignedIds: string[] = (paper.peer_review?.assignedReviewers || []).map((r: any) => String(r));

		// Criar convites para cada revisor, aplicando elegibilidade
		const invitations = [] as any[];
		const skipped = [] as { reviewerId: string; reasons: string[] }[];
		
		for (const reviewerId of reviewerIds) {
			// Carregar dados do revisor
			const reviewer = await Users.findOne({ $or: [{ id: reviewerId }, { _id: reviewerId }] });
			if (!reviewer) {
				skipped.push({ reviewerId: String(reviewerId), reasons: ['Reviewer not found'] });
				continue;
			}

			// Capacidade ativa do revisor
			const activeAssignmentsCount = await ReviewAssignment.countDocuments({ reviewerId: reviewerId, status: { $in: ['accepted', 'pending'] } });

			// Verificar elegibilidade
			const eligibility = checkReviewerEligibility(
				paper as any,
				reviewer as any,
				{
					hubReviewerIds,
					alreadyAssignedIds,
					activeAssignmentsCount,
					maxActiveAssignments: 3,
					requireExpertiseMatch: false
				}
			);

			if (!eligibility.eligible) {
				skipped.push({ reviewerId: String(reviewerId), reasons: eligibility.reasons });
				continue;
			}

			// Verificar se já existe convite pendente (não permitir duplicatas de pending)
			// Se houver convite aceito ou recusado, remover antes de criar novo
			const existingInvites = await PaperReviewInvitation.find({
				paper: paperId,
				reviewer: reviewerId
			});

			// Se há convites anteriores (aceitos ou recusados), remover para permitir novo convite
			if (existingInvites.length > 0) {
				const pendingInvite = existingInvites.find(inv => inv.status === 'pending');
				if (pendingInvite) {
					// Se há pending, skip (não criar duplicata)
					skipped.push({ reviewerId: String(reviewerId), reasons: ['Already invited (pending)'] });
					continue;
				} else {
					// Se não há pending (só accepted/declined), remover anteriores para permitir novo convite
					await PaperReviewInvitation.deleteMany({
						paper: paperId,
						reviewer: reviewerId
					});
					console.log(`🔄 Removed previous invitations for ${reviewerId} to allow re-invitation`);
				}
			}

			const inviteId = crypto.randomUUID();
			const invitation = new PaperReviewInvitation({
				_id: inviteId,
				id: inviteId,
				paper: paperId,
				reviewer: reviewerId,
				invitedBy: user.id,
				hubId: hubId,
				status: 'pending',
				customDeadlineDays: deadlineDays,
				invitedAt: new Date()
			});

			await invitation.save();
			invitations.push(invitation);

			// Criar notificação para o revisor
			if (reviewer) {
				await NotificationService.createNotification({
					user: String(reviewerId),
					type: 'review_request',
					title: 'New Paper Review Request',
					content: `You have been invited to review the paper "${paper.title}". ${availableSlotsCount} slot(s) available.`,
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

		return json({
			success: true,
			invitations: invitations.length,
			skipped: skipped,
			message: `Invited ${invitations.length} reviewer(s). Skipped ${skipped.length} due to ineligibility. The first 3 to accept will occupy the review slots.`,
			availableSlots: availableSlotsCount,
			maxSlots: paper.maxReviewSlots || 3
		});
	} catch (error) {
		console.error('Error creating paper review invitations:', error);
		return json(
			{ error: 'Failed to create invitations' },
			{ status: 500 }
		);
	}
};
