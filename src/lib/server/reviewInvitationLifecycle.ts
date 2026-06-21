import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { emitEvent } from '$lib/services/EventService';
import type { PlatformEventType } from '$lib/types/EventService';
import {
	getInvitationInviterId,
	getInvitationInviterRole,
	getInvitationPaperId,
	getInvitationReviewerId,
	getReviewInvitationExpiresAt
} from './reviewInvitations';

type InvitationLike = Record<string, any>;

type InvitationEventOptions = {
	actorId?: string | null;
	recipients?: string[];
	metadata?: Record<string, unknown>;
};

function asObject(value: InvitationLike): InvitationLike {
	return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function idOf(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (value instanceof Date) return '';
	if (typeof value !== 'object') return '';

	const candidate = value as { id?: unknown; _id?: unknown };
	return idOf(candidate.id) || idOf(candidate._id);
}

function displayName(user: any, fallback: string) {
	if (!user) return fallback;
	return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || fallback;
}

async function findUser(userId: string) {
	if (!userId) return null;
	return Users.findOne({ $or: [{ id: userId }, { _id: userId }] })
		.select('_id id firstName lastName email')
		.lean();
}

async function findPaper(paperId: string) {
	if (!paperId) return null;
	return Papers.findOne({ $or: [{ id: paperId }, { _id: paperId }] })
		.select('_id id title hubId')
		.lean();
}

function defaultRecipientsForEvent(
	type: PlatformEventType,
	reviewerId: string,
	editorId: string,
	actorId: string | null
) {
	switch (type) {
		case 'review.invitation.expired':
			return [editorId || reviewerId];
		case 'review.invitation.duplicate':
			return [actorId || editorId || reviewerId];
		default:
			return [reviewerId, editorId];
	}
}

export async function emitPaperReviewInvitationEvent(
	type: PlatformEventType,
	invitationInput: InvitationLike,
	options: InvitationEventOptions = {}
) {
	const invitation = asObject(invitationInput);
	const invitationId = String(invitation.id || invitation._id || '');
	const paperId = getInvitationPaperId(invitation);
	const reviewerId = getInvitationReviewerId(invitation);
	const editorId = getInvitationInviterId(invitation);
	const actorId = options.actorId ?? editorId ?? null;

	const [paper, reviewer, editor, actor] = await Promise.all([
		findPaper(paperId),
		findUser(reviewerId),
		findUser(editorId),
		findUser(actorId || '')
	]);

	const paperTitle =
		(typeof invitation.paper === 'object' ? invitation.paper?.title : '') ||
		paper?.title ||
		'Untitled paper';
	const hubId = idOf(invitation.hubId) || idOf(paper?.hubId);
	const normalizedPaperId = idOf(paper) || paperId;
	const normalizedReviewerId = reviewer?.id ? String(reviewer.id) : reviewerId;
	const normalizedEditorId = editor?.id ? String(editor.id) : editorId;
	const normalizedActorId = actor?.id ? String(actor.id) : actorId;

	const recipients = [
		...new Set(
			(options.recipients?.length
				? options.recipients
				: defaultRecipientsForEvent(
						type,
						normalizedReviewerId,
						normalizedEditorId,
						normalizedActorId
					)
			)
				.filter(Boolean)
				.map(String)
		)
	];

	if (recipients.length === 0) {
		return null;
	}

	const recipientRoles: Record<string, string> = {};
	if (normalizedReviewerId) recipientRoles[normalizedReviewerId] = 'reviewer';
	if (normalizedEditorId) recipientRoles[normalizedEditorId] = 'editor';
	if (normalizedActorId && !recipientRoles[normalizedActorId])
		recipientRoles[normalizedActorId] = 'actor';

	return emitEvent({
		type,
		actorId: normalizedActorId || null,
		recipients,
		entityType: 'reviewInvitation',
		entityId: invitationId,
		metadata: {
			inviteId: invitationId,
			paperId: normalizedPaperId,
			hubId: hubId || null,
			paperTitle,
			reviewerId: normalizedReviewerId,
			reviewerName: displayName(reviewer, 'Reviewer'),
			editorId: normalizedEditorId,
			editorName: displayName(editor, 'Editor'),
			actorId: normalizedActorId || null,
			actorName: displayName(actor, 'SciLedger'),
			invitedByRole: getInvitationInviterRole(invitation),
			status: invitation.status,
			duplicateOf: invitation.duplicateOf ? String(invitation.duplicateOf) : null,
			customDeadlineDays: invitation.customDeadlineDays ?? null,
			expiresAt: getReviewInvitationExpiresAt(invitation).toISOString(),
			expiredAt: invitation.expiredAt ? new Date(invitation.expiredAt).toISOString() : null,
			cancelledAt: invitation.cancelledAt ? new Date(invitation.cancelledAt).toISOString() : null,
			resendCount: Number(invitation.resendCount || 0),
			parentInvitationId: invitation.parentInvitationId
				? String(invitation.parentInvitationId)
				: null,
			recipientRoles,
			...(options.metadata ?? {})
		}
	});
}
