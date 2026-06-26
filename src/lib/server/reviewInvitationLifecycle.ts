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
import { getPaperAuthorAliases } from './reviewConflictOfInterest';

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
		.select(
			'_id id title hubId mainAuthor correspondingAuthor submittedBy coAuthors authors authorAffiliations'
		)
		.lean();
}

function defaultRecipientsForEvent(
	type: PlatformEventType,
	reviewerId: string,
	editorId: string,
	actorId: string | null,
	authorIds: string[] = []
) {
	const baseRecipients = [reviewerId, editorId];

	switch (type) {
		case 'review.invitation.accepted':
		case 'review.invitation.declined':
		case 'review.invitation.expired':
		case 'review.invitation.cancelled':
			return [...baseRecipients, ...authorIds];
		case 'review.invitation.resent':
		case 'review.invitation.created':
			return baseRecipients;
		case 'review.invitation.duplicate':
			return [reviewerId, actorId || editorId];
		default:
			return baseRecipients;
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
	const normalizedAuthorIds = getPaperAuthorAliases(paper).filter(
		(authorId) => authorId !== normalizedReviewerId && authorId !== normalizedEditorId
	);

	const recipients = [
		...new Set(
			(options.recipients?.length
				? options.recipients
				: defaultRecipientsForEvent(
						type,
						normalizedReviewerId,
						normalizedEditorId,
						normalizedActorId,
						normalizedAuthorIds
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
	for (const authorId of normalizedAuthorIds) {
		recipientRoles[authorId] = 'author';
	}
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
