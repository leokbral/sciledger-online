import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Users from '$lib/db/models/User';
import { getRoleLabel, sortRoleKeysByDisplayPriority } from '$lib/helpers/roleDisplay';

export const ACTIVE_REVIEW_INVITATION_STATUSES = ['pending', 'accepted'] as const;

export type ReviewInvitationStatus = 'pending' | 'accepted' | 'declined' | 'duplicate';

type InvitationLike = Record<string, any>;

export function getIdAliases(value: unknown): string[] {
	if (!value) return [];
	if (typeof value === 'string' || typeof value === 'number') return [String(value)];
	if (value instanceof Date) return [];
	if (typeof value !== 'object') return [];

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		userId?: unknown;
		toString?: () => string;
	};

	const aliases = [
		...getIdAliases(candidate.id),
		...getIdAliases(candidate._id),
		...getIdAliases(candidate.userId)
	];
	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') aliases.push(String(stringified));

	return [...new Set(aliases.filter(Boolean))];
}

export function getInvitationPaperId(invitation: InvitationLike): string {
	return getIdAliases(invitation.paperId)[0] || getIdAliases(invitation.paper)[0] || '';
}

export function getInvitationReviewerId(invitation: InvitationLike): string {
	return getIdAliases(invitation.reviewerId)[0] || getIdAliases(invitation.reviewer)[0] || '';
}

export function getInvitationInviterId(invitation: InvitationLike): string {
	const invitedBy = invitation.invitedBy;
	if (typeof invitedBy === 'string') return invitedBy;
	if (!invitedBy || typeof invitedBy !== 'object') return '';

	return (
		getIdAliases(invitedBy.userId)[0] ||
		getIdAliases(invitedBy.user)[0] ||
		getIdAliases(invitedBy)[0] ||
		''
	);
}

export function getInvitationInviterRole(invitation: InvitationLike): string {
	const invitedBy = invitation.invitedBy;
	if (invitedBy && typeof invitedBy === 'object' && !Array.isArray(invitedBy)) {
		const role = invitedBy.role;
		if (role) return String(role);
	}

	return String(invitation.invitedByRole || invitation.role || 'Member');
}

export function selectInvitationRole(
	roleKeys: Array<string | null | undefined>,
	fallback = 'Member'
) {
	const candidates = roleKeys
		.filter((roleKey): roleKey is string => !!roleKey)
		.filter((roleKey) => !['Reviewer', 'Author'].includes(roleKey));
	return sortRoleKeysByDisplayPriority([...new Set(candidates)])[0] || fallback;
}

export function getReviewInvitationStatusLabel(status: string | null | undefined) {
	switch (status) {
		case 'pending':
			return 'Waiting response';
		case 'accepted':
			return 'Accepted';
		case 'declined':
			return 'Declined';
		case 'duplicate':
			return 'Duplicate';
		default:
			return 'Unknown';
	}
}

export function buildPaperReviewerInvitationQuery(paperIds: string[], reviewerIds: string[]) {
	const normalizedPaperIds = [...new Set(paperIds.filter(Boolean).map(String))];
	const normalizedReviewerIds = [...new Set(reviewerIds.filter(Boolean).map(String))];

	return {
		$or: [
			{ paperId: { $in: normalizedPaperIds }, reviewerId: { $in: normalizedReviewerIds } },
			{ paper: { $in: normalizedPaperIds }, reviewer: { $in: normalizedReviewerIds } },
			{ paperId: { $in: normalizedPaperIds }, reviewer: { $in: normalizedReviewerIds } },
			{ paper: { $in: normalizedPaperIds }, reviewerId: { $in: normalizedReviewerIds } }
		]
	};
}

export async function findActiveReviewInvitation(paperIds: string[], reviewerIds: string[]) {
	if (paperIds.length === 0 || reviewerIds.length === 0) return null;

	return PaperReviewInvitation.findOne({
		...buildPaperReviewerInvitationQuery(paperIds, reviewerIds),
		status: { $in: [...ACTIVE_REVIEW_INVITATION_STATUSES] }
	}).sort({ createdAt: 1, invitedAt: 1 });
}

function normalizeDate(value: unknown): string | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeUser(user: any) {
	if (!user) return null;
	return {
		_id: user._id ? String(user._id) : '',
		id: user.id ? String(user.id) : '',
		firstName: user.firstName || '',
		lastName: user.lastName || '',
		email: user.email || '',
		profilePictureUrl: user.profilePictureUrl || '',
		institution: user.institution || ''
	};
}

function userName(user: any, fallback = 'Unknown user') {
	if (!user) return fallback;
	return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || fallback;
}

async function loadUsersByAliases(ids: string[]) {
	const aliases = [...new Set(ids.filter(Boolean).map(String))];
	if (aliases.length === 0) return new Map<string, any>();

	const users = await Users.find({
		$or: [{ _id: { $in: aliases } }, { id: { $in: aliases } }]
	})
		.select('_id id firstName lastName email profilePictureUrl institution')
		.lean();

	const usersByAlias = new Map<string, any>();
	for (const user of users as any[]) {
		for (const alias of getIdAliases(user)) {
			usersByAlias.set(alias, user);
		}
	}

	return usersByAlias;
}

export async function serializeReviewInvitations(invitations: InvitationLike[]) {
	const inviteDocs = invitations.map((invitation) =>
		typeof invitation?.toObject === 'function' ? invitation.toObject() : invitation
	);
	const userIds = inviteDocs.flatMap((invitation) => [
		getInvitationReviewerId(invitation),
		getInvitationInviterId(invitation)
	]);
	const usersByAlias = await loadUsersByAliases(userIds);

	return inviteDocs.map((invitation) => {
		const paperId = getInvitationPaperId(invitation);
		const reviewerId = getInvitationReviewerId(invitation);
		const inviterId = getInvitationInviterId(invitation);
		const inviterRole = getInvitationInviterRole(invitation);
		const reviewer =
			typeof invitation.reviewer === 'object'
				? invitation.reviewer
				: typeof invitation.reviewerId === 'object'
					? invitation.reviewerId
					: usersByAlias.get(reviewerId);
		const inviterUser = usersByAlias.get(inviterId);

		return {
			_id: String(invitation._id || invitation.id || ''),
			id: String(invitation.id || invitation._id || ''),
			paperId,
			paper: typeof invitation.paper === 'object' ? invitation.paper : null,
			reviewerId,
			reviewer: serializeUser(reviewer),
			hubId: getIdAliases(invitation.hubId)[0] || '',
			invitedBy: {
				userId: inviterId,
				role: inviterRole,
				roleLabel: getRoleLabel(inviterRole),
				user: serializeUser(inviterUser),
				name: userName(inviterUser)
			},
			status: String(invitation.status || 'pending') as ReviewInvitationStatus,
			statusLabel: getReviewInvitationStatusLabel(invitation.status),
			duplicateOf: invitation.duplicateOf ? String(invitation.duplicateOf) : null,
			customDeadlineDays: invitation.customDeadlineDays ?? null,
			invitedAt: normalizeDate(invitation.invitedAt || invitation.createdAt),
			createdAt: normalizeDate(invitation.createdAt || invitation.invitedAt),
			respondedAt: normalizeDate(invitation.respondedAt),
			updatedAt: normalizeDate(invitation.updatedAt)
		};
	});
}

export async function buildDuplicateInvitationDetails(invitation: InvitationLike) {
	const [serialized] = await serializeReviewInvitations([invitation]);
	return {
		message: 'Reviewer already invited for this paper',
		invitation: serialized,
		reviewer: serialized?.reviewer ?? null,
		invitedBy: serialized?.invitedBy ?? null,
		status: serialized?.status ?? null,
		statusLabel: serialized?.statusLabel ?? null,
		invitedAt: serialized?.invitedAt ?? null
	};
}
