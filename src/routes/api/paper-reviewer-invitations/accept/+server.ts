import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Invitations from '$lib/db/models/Invitation';
import type { RequestHandler } from './$types';
import type { User } from '$lib/types/User';

export const POST: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { invitationId } = await request.json();

		if (!invitationId) {
			return json({ error: 'Invitation ID is required' }, { status: 400 });
		}

		// Buscar o convite
		const invitation = await Invitations.findOne({ id: invitationId });
		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		// Verificar se é o revisor convidado
		if (invitation.reviewer.toString() !== user.id) {
			return json({ error: 'This invitation is not for you' }, { status: 403 });
		}

		// Verificar se já foi aceito ou recusado
		if (invitation.status !== 'pending') {
			return json({ error: 'Invitation already processed' }, { status: 400 });
		}

		// Buscar o paper
		const paper = await Papers.findOne({ id: invitation.paper });
		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Atualizar status do convite
		invitation.status = 'accepted';
		invitation.respondedAt = new Date();
		await invitation.save();

		// Adicionar revisor ao paper
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

		// Adicionar aos assignedReviewers
		if (!paper.peer_review.assignedReviewers.some((r: User | string) => String(r) === user.id)) {
			paper.peer_review.assignedReviewers.push(user.id as any);
		}

		// Adicionar resposta de aceitação
		const existingResponse = paper.peer_review.responses.find(
			(r: any) => r.reviewerId === user.id
		);

		if (!existingResponse) {
			paper.peer_review.responses.push({
				_id: crypto.randomUUID(),
				reviewerId: user.id as any,
				status: 'accepted',
				responseDate: new Date(),
				assignedAt: new Date()
			});
		} else {
			existingResponse.status = 'accepted';
			existingResponse.responseDate = new Date();
		}

		// Verificar se tem 3 revisores aceitos para mudar status
		const acceptedCount = paper.peer_review.responses.filter(
			(r: any) => r.status === 'accepted' || r.status === 'completed'
		).length;

		if (acceptedCount >= 3 && paper.status === 'under negotiation') {
			paper.status = 'in review';
			paper.peer_review.reviewStatus = 'in_progress';
		}

		paper.updatedAt = new Date();
		await paper.save();

		// TODO: Criar notificações
		// await NotificationService.createReviewerAcceptedNotifications({...});

		return json({
			success: true,
			message: 'Review invitation accepted successfully',
			paperStatus: paper.status
		});
	} catch (error) {
		console.error('Error accepting paper review invitation:', error);
		return json(
			{ error: 'Failed to accept invitation' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { invitationId } = await request.json();

		if (!invitationId) {
			return json({ error: 'Invitation ID is required' }, { status: 400 });
		}

		// Buscar o convite
		const invitation = await Invitations.findOne({ id: invitationId });
		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		// Verificar se é o revisor convidado
		if (invitation.reviewer.toString() !== user.id) {
			return json({ error: 'This invitation is not for you' }, { status: 403 });
		}

		// Verificar se já foi aceito ou recusado
		if (invitation.status !== 'pending') {
			return json({ error: 'Invitation already processed' }, { status: 400 });
		}

		// Atualizar status do convite para recusado
		invitation.status = 'declined';
		invitation.respondedAt = new Date();
		await invitation.save();

		return json({
			success: true,
			message: 'Review invitation declined'
		});
	} catch (error) {
		console.error('Error declining paper review invitation:', error);
		return json(
			{ error: 'Failed to decline invitation' },
			{ status: 500 }
		);
	}
};
