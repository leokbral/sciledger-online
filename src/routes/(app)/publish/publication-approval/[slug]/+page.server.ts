import Papers from '$lib/db/models/Paper';
import { error, redirect } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import type { PageServerLoad } from './$types';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

// Função de sanitização
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
		.populate('authors')
		.populate('mainAuthor')
		.populate('coAuthors')
		.populate({
			path: 'hubId',
			match: { isLinkedToHub: true }
		})
		.populate({
			path: 'peer_review.assignedReviewers',
			model: 'User',
			select: 'firstName lastName email roles'
		})
		.populate({
			path: 'peer_review.reviews',
			model: 'Review',
			options: { sort: { submissionDate: -1 } },
			populate: {
				path: 'reviewerId',
				model: 'User',
				select: 'firstName lastName email roles'
			}
		})
		.lean()
		.exec();

	if (!paperDoc) {
		throw error(404, 'Paper not found');
	}

	const userId = locals.user.id;

	// Verificar se é dono do hub
	const hubCreatorId = typeof paperDoc.hubId === 'object'
		? (paperDoc.hubId?.createdBy?._id || paperDoc.hubId?.createdBy?.id || paperDoc.hubId?.createdBy)
		: null;
	const isHubOwner = hubCreatorId?.toString() === userId;

	// Verificar se é revisor do hub
	const isHubReviewer = typeof paperDoc.hubId === 'object' && paperDoc.hubId?.reviewers?.includes(userId);

	// Apenas donos e revisores do hub podem acessar esta página
	if (!isHubOwner && !isHubReviewer) {
		throw error(403, 'You do not have permission to view this page');
	}

	// Verificar se o paper está aguardando aprovação de publicação
	if (paperDoc.status !== 'under negotiation') {
		throw error(400, 'This paper is not awaiting publication approval');
	}

	return {
		paper: sanitize(paperDoc)
	};
};
