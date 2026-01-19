import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';

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

export async function load({ locals, params }) {
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

	// Redirecionar baseado no status e tipo de usuário
	if (paperStatus !== 'published') {
		// Autores vão para a rota apropriada baseado no status do paper
		if (isPaperAuthor) {
			if (paperStatus === 'draft') {
				redirect(302, `/publish/edit/${paperDoc.id}`);
			} else if (paperStatus === 'under negotiation') {
				// Paper submetido ao hub (under negotiation): usa a rota existente de negociação
				redirect(302, `/publish/negotiation/${paperDoc.id}`);
			} else if (paperStatus === 'in review') {
				redirect(302, `/publish/inreview/${paperDoc.id}`);
			} else if (paperStatus === 'needing corrections') {
				redirect(302, `/publish/corrections/${paperDoc.id}`);
			}
			// Fallback para edição
			redirect(302, `/publish/edit/${paperDoc.id}`);
		}
		
		// Revisores (do paper ou do hub) e dono do hub vão para a rota de revisão apropriada
		if (isReviewer || isHubReviewer || isHubOwner) {
			if (paperStatus === 'under negotiation') {
				redirect(302, `/review/paperspool/${paperDoc.id}`);
			} else if (paperStatus === 'in review') {
				redirect(302, `/review/inreview/${paperDoc.id}`);
			} else if (paperStatus === 'needing corrections') {
				redirect(302, `/review/correction/${paperDoc.id}`);
			}
			// Se não cair em nenhum caso específico, vai para edição
			redirect(302, `/publish/edit/${paperDoc.id}`);
		}

		// Se não é autor, revisor ou dono do hub, não tem permissão
		throw error(403, 'You do not have permission to view this paper');
	}

	const usersDoc = await Users.find({}, {}).lean().exec();

	// ✅ Retornar versão sanitizada
	return {
		paper: sanitize(paperDoc),
		users: sanitize(usersDoc)
	};
}

export const actions = {
	default: async ({ locals }) => {
		if (!locals.user) error(401);
		return { success: true };
	}
};
