import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Invitations from '$lib/db/models/Invitation';
import type { RequestHandler } from './$types';
import type { User } from '$lib/types/User';
import * as crypto from 'crypto';
import { emitEvent } from '$lib/services/EventService';
import {
	getPaperAuthorAliases,
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from '$lib/server/reviewConflictOfInterest';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

function normalizeId(value: any): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return String(value);
}

function displayName(user: any, fallback: string) {
	return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || fallback;
}

async function emitLegacyReviewInvitationEvent(
	type: 'review.invitation.accepted' | 'review.invitation.declined',
	input: { invitation: any; paper: any; user: any }
) {
	const { invitation, paper, user } = input;
	const reviewerId = normalizeId(invitation.reviewer) || normalizeId(user);
	const editorId = normalizeId(paper?.submittedBy);
	const paperId =
		normalizeId(paper?.id) || normalizeId(paper?._id) || normalizeId(invitation.paper);
	const authorIds = getPaperAuthorAliases(paper).filter(
		(authorId) => authorId !== reviewerId && authorId !== editorId
	);
	const recipients = [...new Set([reviewerId, editorId, ...authorIds].filter(Boolean))];

	if (recipients.length === 0) {
		return;
	}

	await emitEvent({
		type,
		actorId: normalizeId(user) || reviewerId || null,
		recipients,
		entityType: 'reviewInvitation',
		entityId: normalizeId(invitation.id) || normalizeId(invitation._id) || paperId,
		metadata: {
			inviteId: normalizeId(invitation.id) || normalizeId(invitation._id),
			paperId,
			paperTitle: paper?.title || 'Untitled paper',
			hubId: normalizeId(invitation.hubId) || normalizeId(paper?.hubId) || null,
			reviewerId,
			reviewerName: displayName(user, 'Reviewer'),
			editorId,
			status: invitation.status,
			source: 'legacy_paper_reviewer_invitations_accept',
			recipientRoles: Object.fromEntries(
				recipients.map((recipientId) => [
					recipientId,
					recipientId === reviewerId
						? 'reviewer'
						: authorIds.includes(recipientId)
							? 'author'
							: 'editor'
				])
			)
		}
	});
}

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

		const conflictValidation = validateReviewerCanReviewPaper(paper as any, user);
		if (!conflictValidation.allowed) {
			return json({ error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE }, { status: 403 });
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

		if (!paper.reviewers) {
			paper.reviewers = [];
		}
		if (!paper.reviewers.some((reviewer: User | string) => String(reviewer) === user.id)) {
			paper.reviewers.push(user.id);
		}

		// Adicionar resposta de aceitação
		const existingResponse = paper.peer_review.responses.find((r: any) => r.reviewerId === user.id);

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

		const shouldSendToReview = acceptedCount >= 3 && paper.status === 'reviewer assignment';

		paper.updatedAt = new Date();
		await paper.save();

		if (shouldSendToReview) {
			try {
				await transitionPaperStatus({
					paperId: String(paper.id),
					action: 'paper.sendToReview',
					expectedStatus: 'reviewer assignment',
					system: true,
					metadata: {
						endpoint: '/api/paper-reviewer-invitations/accept',
						trigger: 'legacy_invitation_acceptance'
					}
				});
				paper.status = 'in review';
			} catch (transitionError) {
				if (transitionError instanceof EditorialTransitionError) {
					console.warn('Legacy invitation status transition skipped:', transitionError.message);
				} else {
					throw transitionError;
				}
			}
		}

		// TODO: Criar notificações

		try {
			await emitLegacyReviewInvitationEvent('review.invitation.accepted', {
				invitation,
				paper,
				user
			});
		} catch (eventError) {
			console.error('Failed to emit legacy review invitation accepted event:', eventError);
		}

		return json({
			success: true,
			message: 'Review invitation accepted successfully',
			paperStatus: paper.status
		});
	} catch (error) {
		console.error('Error accepting paper review invitation:', error);
		return json({ error: 'Failed to accept invitation' }, { status: 500 });
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
		const paper = invitation.paper ? await Papers.findOne({ id: invitation.paper }).lean() : null;
		try {
			await emitLegacyReviewInvitationEvent('review.invitation.declined', {
				invitation,
				paper,
				user
			});
		} catch (eventError) {
			console.error('Failed to emit legacy review invitation declined event:', eventError);
		}

		return json({
			success: true,
			message: 'Review invitation declined'
		});
	} catch (error) {
		console.error('Error declining paper review invitation:', error);
		return json({ error: 'Failed to decline invitation' }, { status: 500 });
	}
};
