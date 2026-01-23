import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { PageServerLoad, Actions } from './$types';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// ✅ Função de sanitização
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

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, `/login`);

	await start_mongo();

	const paperDoc = await Papers.findOne({ id: params.slug })
		.populate("authors")
		.populate("mainAuthor")
		.populate("coAuthors")
		.populate({
			path: 'hubId',
			match: { isLinkedToHub: true }
		})
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Paper not found');
	}

	const userId = locals.user.id;
	const paperStatus = paperDoc.status;

	// Verificar tipo de usuário
	const mainAuthorId = typeof paperDoc.mainAuthor === 'object' 
		? (paperDoc.mainAuthor._id || paperDoc.mainAuthor.id) 
		: paperDoc.mainAuthor;
	const correspondingAuthorId = typeof paperDoc.correspondingAuthor === 'object'
		? (paperDoc.correspondingAuthor._id || paperDoc.correspondingAuthor.id)
		: paperDoc.correspondingAuthor;
	const submittedById = typeof paperDoc.submittedBy === 'object'
		? (paperDoc.submittedBy._id || paperDoc.submittedBy.id)
		: paperDoc.submittedBy;
	
	const isMainAuthor = mainAuthorId?.toString() === userId;
	const isCorrespondingAuthor = correspondingAuthorId?.toString() === userId;
	const isSubmitter = submittedById?.toString() === userId;
	const isCoAuthor = paperDoc.coAuthors?.some((author: any) => {
		const authorId = typeof author === 'object' ? (author._id || author.id) : author;
		return authorId?.toString() === userId;
	});
	const isPaperAuthor = isMainAuthor || isCorrespondingAuthor || isSubmitter || isCoAuthor;

	// Verificar se é dono do hub ou revisor do hub
	const hubCreatorId = typeof paperDoc.hubId === 'object'
		? (paperDoc.hubId?.createdBy?._id || paperDoc.hubId?.createdBy?.id || paperDoc.hubId?.createdBy)
		: null;
	const isHubOwner = hubCreatorId?.toString() === userId;
	
	const isHubReviewer = typeof paperDoc.hubId === 'object' && paperDoc.hubId?.reviewers?.includes(userId);

	// Verificar se é revisor designado do paper
	const isReviewer = paperDoc.peer_review?.responses?.some((r: any) => 
		r.reviewerId === userId && (r.status === 'accepted' || r.status === 'completed')
	);

	// Esta rota é para papers em negotiation ou rejeitados - apenas hub owner/reviewer podem ver
	if (paperStatus === 'published') {
		// Se está publicado, redireciona para a rota published
		redirect(302, `/publish/published/${paperDoc.id}`);
	}

	// Verificar permissões - apenas hub owner, hub reviewer ou revisor designado podem ver
	if (!isHubOwner && !isHubReviewer && !isReviewer) {
		// Autores devem ver suas próprias rotas
		if (isPaperAuthor) {
			if (paperStatus === 'draft') {
				redirect(302, `/publish/edit/${paperDoc.id}`);
			} else if (paperStatus === 'under negotiation') {
				redirect(302, `/publish/negotiation/${paperDoc.id}`);
			} else if (paperStatus === 'in review') {
				redirect(302, `/publish/inreview/${paperDoc.id}`);
			} else if (paperStatus === 'needing corrections') {
				redirect(302, `/publish/corrections/${paperDoc.id}`);
			}
		}
		throw error(403, 'You do not have permission to view this paper');
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	// ✅ Retornar versão sanitizada
	return {
		paper: sanitize(paperDoc),
		users: sanitize(usersDoc)
	};
}

export const actions: Actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
