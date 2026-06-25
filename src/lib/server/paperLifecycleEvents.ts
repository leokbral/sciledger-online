import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { emitEvent } from '$lib/services/EventService';
import type { EmitEventResult, PlatformEventType } from '$lib/types/EventService';
import { resolveEffectiveHubRoles } from './authorization/effectiveHubRoles';

type EntityLike = Record<string, any>;

type PaperLifecycleEventOptions = {
	actorId?: string | null;
	recipients?: string[];
	authorIds?: string[];
	reviewerIds?: string[];
	editorIds?: string[];
	metadata?: Record<string, unknown>;
};

type TransitionEventDefinition = {
	type: PlatformEventType;
	metadata?: Record<string, unknown>;
};

const PAPER_TRANSITION_EVENTS: Record<string, TransitionEventDefinition> = {
	'paper.submit': { type: 'paper.submitted' },
	'paper.sendToReview': {
		type: 'paper.accepted',
		metadata: { acceptanceType: 'review' }
	},
	'paper.requestCorrections': { type: 'paper.correction_requested' },
	'paper.autoRequestCorrections': {
		type: 'paper.correction_requested',
		metadata: { automatic: true }
	},
	'paper.submitFinalReview': { type: 'paper.final_review_submitted' },
	'paper.requestPublication': { type: 'paper.publication_requested' },
	'paper.accept': {
		type: 'paper.accepted',
		metadata: { acceptanceType: 'final' }
	},
	'paper.reject': { type: 'paper.rejected' },
	'paper.rejectPublication': {
		type: 'paper.correction_requested',
		metadata: { correctionReason: 'publication_rejected' }
	},
	'paper.publish': { type: 'paper.published' },
	'paper.publishStandalone': {
		type: 'paper.published',
		metadata: { publicationMode: 'standalone' }
	},
	'paper.withdraw': { type: 'paper.withdrawn' }
};

function asObject(value: EntityLike): EntityLike {
	return typeof value?.toObject === 'function' ? value.toObject() : value;
}

function idOf(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (value instanceof Date) return '';
	if (typeof value !== 'object') return '';

	const candidate = value as { id?: unknown; _id?: unknown; toString?: () => string };
	const nested = idOf(candidate.id) || idOf(candidate._id);
	if (nested) return nested;

	const serialized = candidate.toString?.();
	return serialized && serialized !== '[object Object]' ? serialized : '';
}

function uniqueIds(values: unknown[]): string[] {
	return [
		...new Set(
			values
				.flatMap((value) => (Array.isArray(value) ? value : [value]))
				.map(idOf)
				.map((value) => value.trim())
				.filter((value) => value && value !== 'undefined' && value !== 'null')
		)
	];
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

async function findHub(hubId: string) {
	if (!hubId) return null;
	return Hubs.findOne({ $or: [{ id: hubId }, { _id: hubId }] })
		.select('_id id title')
		.lean();
}

function getPaperId(paper: EntityLike) {
	return idOf(paper) || idOf(paper.id) || idOf(paper._id);
}

function getPaperTitle(paper: EntityLike) {
	return String(paper.title || paper.paperTitle || 'Untitled paper');
}

function getPaperHubId(paper: EntityLike) {
	return idOf(paper.hubId) || idOf(paper.hub);
}

function collectPaperAuthorIds(paper: EntityLike) {
	return uniqueIds([
		paper.mainAuthor,
		paper.correspondingAuthor,
		paper.submittedBy,
		paper.author,
		paper.createdBy,
		paper.coAuthors || [],
		paper.authors || []
	]);
}

function collectPaperReviewerIds(paper: EntityLike) {
	return uniqueIds([
		paper.reviewers || [],
		paper.peer_review?.assignedReviewers || [],
		paper.peerReview?.assignedReviewers || []
	]);
}

async function getHubMemberIdsByRole(hubId: string, roleKeys: string[]) {
	const hub = await findHub(hubId);
	if (!hub) return [];

	try {
		const roleSet = new Set(roleKeys);
		const effectiveHubRoles = await resolveEffectiveHubRoles(hub);
		return uniqueIds(
			effectiveHubRoles.members
				.filter((member) => member.primaryRoleKey && roleSet.has(member.primaryRoleKey))
				.map((member) => member.userId)
		);
	} catch (error) {
		console.error('Failed to resolve hub members for paper event:', error);
		return [];
	}
}

async function getHubOwnerIds(hubId: string) {
	return getHubMemberIdsByRole(hubId, ['HubOwner']);
}

async function getHubEditorialIds(hubId: string) {
	return getHubMemberIdsByRole(hubId, ['HubOwner', 'EditorChief']);
}

async function defaultPaperRecipients(
	type: PlatformEventType,
	paper: EntityLike,
	options: PaperLifecycleEventOptions
) {
	const authorIds = uniqueIds(options.authorIds ?? collectPaperAuthorIds(paper));
	const reviewerIds = uniqueIds(options.reviewerIds ?? collectPaperReviewerIds(paper));
	const hubId = getPaperHubId(paper);
	let defaultEditorIds: string[] = [];
	if (hubId) {
		if (
			type === 'paper.publication_requested' ||
			type === 'paper.final_review_submitted' ||
			type === 'paper.corrections_submitted' ||
			type === 'paper.correction_deadline.updated'
		) {
			defaultEditorIds = await getHubEditorialIds(hubId);
		} else if (type === 'paper.submitted' || type === 'paper.withdrawn') {
			defaultEditorIds = await getHubOwnerIds(hubId);
		}
	}
	const editorIds = uniqueIds(options.editorIds ?? defaultEditorIds);
	const acceptanceType = String(options.metadata?.acceptanceType || '');

	if (type === 'paper.created') {
		return { authorIds, reviewerIds, editorIds, recipients: authorIds };
	}

	if (type === 'paper.submitted') {
		return { authorIds, reviewerIds, editorIds, recipients: uniqueIds([authorIds, editorIds]) };
	}

	if (type === 'paper.accepted') {
		const includeReviewers = acceptanceType === 'review' || acceptanceType === 'final';
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: uniqueIds([authorIds, includeReviewers ? reviewerIds : []])
		};
	}

	if (type === 'paper.rejected') {
		return { authorIds, reviewerIds, editorIds, recipients: uniqueIds([authorIds, reviewerIds]) };
	}

	if (type === 'paper.published' || type === 'paper.correction_requested') {
		return { authorIds, reviewerIds, editorIds, recipients: authorIds };
	}

	if (type === 'paper.corrections_submitted') {
		const includeReviewers = options.metadata?.requiresNewReview === true;
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: uniqueIds([authorIds, editorIds, includeReviewers ? reviewerIds : []])
		};
	}

	if (type === 'paper.final_review_submitted') {
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: uniqueIds([editorIds, reviewerIds])
		};
	}

	if (type === 'paper.publication_requested') {
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: editorIds
		};
	}

	if (type === 'paper.withdrawn') {
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: uniqueIds([authorIds, editorIds, reviewerIds])
		};
	}

	if (type === 'paper.correction_deadline.updated') {
		return {
			authorIds,
			reviewerIds,
			editorIds,
			recipients: uniqueIds([authorIds, editorIds])
		};
	}

	return { authorIds, reviewerIds, editorIds, recipients: authorIds };
}

function buildRecipientRoles(groups: {
	authorIds: string[];
	reviewerIds: string[];
	editorIds: string[];
	actorId?: string | null;
}) {
	const roles: Record<string, string> = {};

	for (const authorId of groups.authorIds) roles[authorId] = 'author';
	for (const reviewerId of groups.reviewerIds) {
		if (!roles[reviewerId]) roles[reviewerId] = 'reviewer';
	}
	for (const editorId of groups.editorIds) {
		if (!roles[editorId]) roles[editorId] = 'editor';
	}
	if (groups.actorId && !roles[groups.actorId]) roles[groups.actorId] = 'actor';

	return roles;
}

export async function emitPaperLifecycleEvent(
	type: PlatformEventType,
	paperInput: EntityLike,
	options: PaperLifecycleEventOptions = {}
): Promise<EmitEventResult | null> {
	const paper = asObject(paperInput);
	const paperId = getPaperId(paper);

	if (!paperId) {
		return null;
	}

	const actorId = options.actorId ? idOf(options.actorId) : null;
	const [actor, hub] = await Promise.all([findUser(actorId || ''), findHub(getPaperHubId(paper))]);
	const defaultGroups = await defaultPaperRecipients(type, paper, options);
	const recipients = uniqueIds(options.recipients?.length ? options.recipients : defaultGroups.recipients);

	if (recipients.length === 0) {
		return null;
	}

	const recipientRoles = {
		...buildRecipientRoles({ ...defaultGroups, actorId }),
		...((options.metadata?.recipientRoles as Record<string, string> | undefined) ?? {})
	};

	return emitEvent({
		type,
		actorId,
		recipients,
		entityType: 'paper',
		entityId: paperId,
		metadata: {
			paperId,
			paperTitle: getPaperTitle(paper),
			hubId: getPaperHubId(paper) || null,
			hubName: hub?.title || null,
			status: paper.status || null,
			reviewRound: paper.reviewRound ?? null,
			authorIds: defaultGroups.authorIds,
			reviewerIds: defaultGroups.reviewerIds,
			editorIds: defaultGroups.editorIds,
			actorId,
			actorName: displayName(actor, 'SciLedger'),
			recipientRoles,
			...(options.metadata ?? {})
		}
	});
}

export async function emitPaperLifecycleTransitionEvent(
	action: string,
	paperInput: EntityLike,
	options: PaperLifecycleEventOptions = {}
) {
	const definition = PAPER_TRANSITION_EVENTS[action];
	if (!definition) {
		return null;
	}

	return emitPaperLifecycleEvent(definition.type, paperInput, {
		...options,
		metadata: {
			...(definition.metadata ?? {}),
			action,
			...(options.metadata ?? {})
		}
	});
}

export async function emitReviewSubmittedEvent(
	reviewInput: EntityLike,
	paperInput: EntityLike,
	options: PaperLifecycleEventOptions = {}
) {
	const review = asObject(reviewInput);
	const paper = asObject(paperInput);
	const reviewId = getPaperId(review);
	const paperId = idOf(review.paperId) || getPaperId(paper);

	if (!reviewId || !paperId) {
		return null;
	}

	const reviewerId = idOf(review.reviewerId) || options.actorId || null;
	const reviewDecision = String(review.recommendation || options.metadata?.reviewDecision || '');
	const editorId = uniqueIds(options.editorIds ?? [paper.submittedBy])[0] || '';
	const authorId = uniqueIds(options.authorIds ?? collectPaperAuthorIds(paper))[0] || '';
	const shouldNotifyAuthor = [
		'accept',
		'accept_without_changes',
		'accept_with_minor_revisions',
		'minor_revision',
		'major_revision'
	].includes(reviewDecision);
	const recipients = uniqueIds(
		options.recipients?.length ? options.recipients : [editorId, shouldNotifyAuthor ? authorId : '']
	);

	if (recipients.length === 0) {
		return null;
	}

	const [reviewer, editor] = await Promise.all([
		findUser(reviewerId || ''),
		findUser(editorId || '')
	]);
	const recipientRoles: Record<string, string> = {};
	if (editorId) recipientRoles[editorId] = 'editor';
	if (authorId && shouldNotifyAuthor) recipientRoles[authorId] = 'author';
	if (reviewerId && !recipientRoles[reviewerId]) recipientRoles[reviewerId] = 'actor';

	return emitEvent({
		type: 'review.submitted',
		actorId: reviewerId,
		recipients,
		entityType: 'review',
		entityId: reviewId,
		metadata: {
			reviewId,
			paperId,
			paperTitle: getPaperTitle(paper),
			hubId: getPaperHubId(paper) || null,
			reviewerId,
			reviewerName: displayName(reviewer, 'Reviewer'),
			editorId,
			editorName: displayName(editor, 'Editor'),
			authorId,
			reviewDecision,
			reviewRound: review.reviewRound ?? paper.reviewRound ?? null,
			recipientRoles,
			...(options.metadata ?? {})
		}
	});
}
