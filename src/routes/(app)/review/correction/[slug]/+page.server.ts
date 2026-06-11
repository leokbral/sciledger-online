import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongo';
import {
	getEffectiveHubMemberForUser,
	resolveEffectiveHubRoles
} from '$lib/server/authorization/effectiveHubRoles';
import { can } from '$lib/server/authorization/authorizationService';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// Função sanitize para converter ObjectId e Date em strings
function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}
	
	if (Array.isArray(obj)) {
		return obj.map(sanitize);
	}
	
	if (obj && typeof obj === 'object') {
		// Handle MongoDB ObjectId
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}
		
		// Handle Date objects
		if (obj instanceof Date) {
			return obj.toISOString();
		}
		
		// Handle regular objects
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

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	try {
		const userId = locals.user.id;

		// Buscar paper pelo slug (ajuste se o campo correto for outro)
		const paperRaw = await Papers.findOne({ id: params.slug }, {})
			.populate("authors")
			.populate("mainAuthor")
			.populate("coAuthors")
			.populate("hubId")
			.populate({
				path: 'peer_review.reviews',
				model: 'Review',
				options: { sort: { submissionDate: -1 } },
				populate: {
					path: 'reviewerId',
					model: 'User',
					select: 'firstName lastName username email roles isAdmin'
				}
			})
			.lean()
			.exec();

		if (!paperRaw) {
			throw error(404, 'Paper not found');
		}

		// Verificar permissões: revisor aceito, revisor do hub ou dono do hub
		const isReviewerAccepted = (paperRaw.peer_review?.responses ?? []).some((response: any) => {
			return (
				(response?.status === 'accepted' || response?.status === 'completed') &&
				matchesCurrentUser(response?.reviewerId, userId)
			);
		});

		const effectiveHubRoles =
			typeof paperRaw.hubId === 'object' && paperRaw.hubId
				? await resolveEffectiveHubRoles(paperRaw.hubId)
				: null;
		const currentUserHubMember = getEffectiveHubMemberForUser(effectiveHubRoles, locals.user);
		const isHubReviewer = currentUserHubMember?.canReview === true;
		const isHubOwner = currentUserHubMember?.primaryRoleKey === 'HubOwner';
		const isViceManager = currentUserHubMember?.canAssignReviewers === true;
		const isPlatformAdmin = await can(locals.user, 'rbac.manage');

		// Verificar se aceitou via ReviewQueue (novo sistema)
		const ReviewQueue = (await import('$lib/db/models/ReviewQueue')).default;
		const hasAcceptedViaQueue = await ReviewQueue.findOne({
			paperId: params.slug,
			reviewer: userId,
			status: 'accepted'
		}).lean();

		const canSubmitReview =
			isReviewerAccepted || Boolean(hasAcceptedViaQueue) || isHubReviewer;

		const canViewSubmittedReviews =
			!canSubmitReview && (isHubOwner || isViceManager || isPlatformAdmin);

		if (!canSubmitReview && !canViewSubmittedReviews) {
			throw error(403, 'You do not have permission to view this paper');
		}

		// Normalizar peer_review igual ao primeiro código
		const peer_review = paperRaw.peer_review
			? {
					reviewType: paperRaw.peer_review.reviewType,
					assignedReviewers: paperRaw.peer_review.assignedReviewers ?? [],
					responses: paperRaw.peer_review.responses ?? [],
					reviews: paperRaw.peer_review.reviews ?? [],
					averageScore: paperRaw.peer_review.averageScore ?? 0,
					reviewCount: paperRaw.peer_review.reviewCount ?? 0,
					reviewStatus: paperRaw.peer_review.reviewStatus ?? 'not_started'
			  }
			: {
					reviewType: "open",
					assignedReviewers: [],
					responses: [],
					reviews: [],
					averageScore: 0,
					reviewCount: 0,
					reviewStatus: "not_started"
			  };

		const paper = {
			...paperRaw,
			peer_review
		};

		// Buscar usuários
		const usersRaw = await Users.find({}, {}).lean().exec();

		// Sanitizar antes de retornar
		return {
			paper: sanitize(paper),
			user: sanitize(locals.user),
			users: sanitize(usersRaw),
			isHubOwner,
			canSubmitReview,
			canViewSubmittedReviews
		};

	} catch (err) {
		console.error('Error loading paper:', err);
		throw error(500, 'Internal Server Error');
	}
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		return { success: true };
	}
};
