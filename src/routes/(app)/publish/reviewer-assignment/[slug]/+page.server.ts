import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import '$lib/db/models/Review';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	getEffectiveHubMemberForUser,
	resolveEffectiveHubRoles
} from '$lib/server/authorization/effectiveHubRoles';
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

function getIdAliases(value: unknown): string[] {
	if (!value) return [];

	if (typeof value === 'string') {
		return [String(value)];
	}

	if (typeof value !== 'object') {
		return [];
	}

	const candidate = value as {
		id?: unknown;
		_id?: unknown;
		toString?: () => string;
	};

	const aliases = [candidate.id, candidate._id]
		.filter(Boolean)
		.map((alias) => String(alias));

	const stringified = candidate.toString?.();
	if (stringified && stringified !== '[object Object]') {
		aliases.push(String(stringified));
	}

	return Array.from(new Set(aliases));
}

function matchesCurrentUser(value: unknown, userId: string): boolean {
	return getIdAliases(value).includes(String(userId));
}

function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}

	if (obj && typeof obj === 'object') {
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}

		if (obj instanceof Date) {
			return obj.toISOString();
		}

		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				const value = (obj as Record<string, unknown>)[key];
				clean[key] = sanitize(value);
			}
		}
		return clean;
	}

	return obj;
}

export async function load({ locals, params }) {
	if (!locals.user) throw redirect(302, `/login`);

	await start_mongo();
	const userId = locals.user.id;

	const paperDoc = await Papers.findOne({ id: params.slug }, {})
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate({
			path: 'hubId',
			populate: {
				path: 'reviewers',
				model: 'User'
			}
		})
		.populate({
			path: 'peer_review.reviews',
			populate: {
				path: 'reviewerId',
				model: 'User'
			}
		})
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Paper not found');
	}

	const isMainAuthor = matchesCurrentUser(paperDoc.mainAuthor, userId);
	const isCoAuthor =
		Array.isArray(paperDoc.coAuthors) &&
		paperDoc.coAuthors.some((author: any) => matchesCurrentUser(author, userId));
	const isSubmitter = matchesCurrentUser((paperDoc as any).submittedBy, userId);
	const isAuthor = isMainAuthor || isCoAuthor || isSubmitter;

	const effectiveHubRoles =
		typeof paperDoc.hubId === 'object' && paperDoc.hubId
			? await resolveEffectiveHubRoles(paperDoc.hubId)
			: null;
	const currentUserHubMember = getEffectiveHubMemberForUser(effectiveHubRoles, locals.user);
	const isHubOwner = currentUserHubMember?.primaryRoleKey === 'HubOwner';
	const isHubReviewer = currentUserHubMember?.canReview === true;

	const assignmentAuthorization = await authorize(locals.user, 'paper.assignReviewers', {
		paper: paperDoc
	});
	const canManageHub = assignmentAuthorization.allowed;

	const hasAcceptedResponse = (paperDoc.peer_review?.responses ?? []).some((response: any) => {
		return (
			matchesCurrentUser(response?.reviewerId, userId) &&
			(response?.status === 'accepted' || response?.status === 'completed')
		);
	});

	const isPaperReviewer =
		(paperDoc.reviewers ?? []).some((reviewer: any) => matchesCurrentUser(reviewer, userId)) ||
		(paperDoc.peer_review?.assignedReviewers ?? []).some((reviewer: any) =>
			matchesCurrentUser(reviewer, userId)
		) ||
		hasAcceptedResponse;

	const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
	const hasAcceptedViaQueue = await ReviewQueue.findOne({
		paperId: params.slug,
		reviewer: userId,
		status: 'accepted'
	}).lean();

	if (!isAuthor && !isHubOwner && (isPaperReviewer || isHubReviewer || hasAcceptedViaQueue)) {
		throw redirect(302, `/review/inreview/${params.slug}`);
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	let reviewAssignments: unknown[] = [];
	if (canManageHub) {
		const ReviewAssignment = (await import('$lib/db/models/ReviewAssignment')).default;
		reviewAssignments = await ReviewAssignment.find({ paperId: params.slug })
			.populate('reviewerId')
			.lean()
			.exec();
	}

	const pendingPaperReviewInvitations = await PaperReviewInvitation.find({
		paper: params.slug,
		status: 'pending'
	})
		.select('reviewer')
		.lean()
		.exec();

	const pendingReviewerIds = pendingPaperReviewInvitations
		.map((invitation: any) => String(invitation?.reviewer || '').trim())
		.filter(Boolean);

	// Block authors from performing reviewer assignment when paper is linked to a hub
	const paperStatus = String(paperDoc.status || '').toLowerCase();
	const assignmentLockedForAuthor =
		isAuthor &&
		(Boolean(paperDoc.hubId) || Boolean((paperDoc as any).isLinkedToHub)) &&
		(['in review', 'needing corrections'].includes(paperStatus)) &&
		!canManageHub;

	return {
		paper: sanitize(paperDoc),
		users: sanitize(usersDoc),
		isHubOwner,
		canManageHub,
		currentUserHubMember: sanitize(currentUserHubMember),
		effectiveReviewers: sanitize(effectiveHubRoles?.reviewers ?? []),
		assignmentLockedForAuthor,
		reviewAssignments: sanitize(reviewAssignments),
		pendingReviewerIds
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
