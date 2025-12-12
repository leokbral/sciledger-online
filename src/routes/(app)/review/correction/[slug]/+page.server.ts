import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongo';

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
			.lean()
			.exec();

		if (!paperRaw) {
			throw error(404, 'Paper not found');
		}

		// Verificar permissões: revisor aceito, revisor do hub ou dono do hub
		const isReviewerAccepted = paperRaw.peer_review?.responses?.some(
			(r: any) => r.reviewerId === userId && (r.status === 'accepted' || r.status === 'completed')
		);
		
		const isHubReviewer = typeof paperRaw.hubId === 'object' && 
			Array.isArray(paperRaw.hubId?.reviewers) && 
			paperRaw.hubId?.reviewers?.includes(userId);
		
		const hubCreatorId = typeof paperRaw.hubId === 'object'
			? (paperRaw.hubId?.createdBy?._id || paperRaw.hubId?.createdBy?.id || paperRaw.hubId?.createdBy)
			: null;
		const isHubOwner = hubCreatorId?.toString() === userId;

		if (!isReviewerAccepted && !isHubReviewer && !isHubOwner) {
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
			users: sanitize(usersRaw)
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
