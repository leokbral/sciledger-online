import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';

// Type for MongoDB ObjectId
interface ObjectId {
	toString(): string;
	constructor: { name: string };
}

function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(sanitize);
	if (obj && typeof obj === 'object') {
		if (obj.constructor?.name === 'ObjectId' && typeof (obj as ObjectId).toString === 'function') {
			return (obj as ObjectId).toString();
		}
		if (obj instanceof Date) return obj.toISOString();
		const clean: Record<string, unknown> = {};
		for (const key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				clean[key] = sanitize((obj as Record<string, unknown>)[key]);
			}
		}
		return clean;
	}
	return obj;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/login');
	await start_mongo();

	const paperDoc: any = await Papers.findOne({ id: params.slug }, {})
		.populate('mainAuthor')
		.populate('coAuthors')
		.populate({
			path: 'hubId',
			populate: {
				path: 'createdBy',
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

	if (!paperDoc) throw error(404, 'Paper not found');
	if (!paperDoc.hubId) throw error(400, 'Paper is not associated with a hub');

	const hubCreatorId = typeof paperDoc.hubId === 'object'
		? (paperDoc.hubId?.createdBy?._id || paperDoc.hubId?.createdBy?.id || paperDoc.hubId?.createdBy)
		: null;
	const isHubOwner = hubCreatorId?.toString?.() === locals.user.id;

	if (!isHubOwner) throw error(403, 'Only the hub owner can view this page');

	if (paperDoc.reviewRound !== 2) {
		throw error(400, 'Publication approval is only available after round 2');
	}

	if (paperDoc.status !== 'under negotiation') {
		throw error(400, 'Paper is not pending publication approval');
	}

	return {
		paper: sanitize(paperDoc),
		isHubOwner
	};
};
