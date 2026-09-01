import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';
import Users from '$lib/db/models/User';
import { authorize } from '$lib/server/authorization/authorizationService';

// GET /api/papers/:id
// Retorna o paper com reviews populadas (inclusive dados do revisor)
export const GET: RequestHandler = async ({ params }) => {
	try {
		await start_mongo();
		const paperId = params.id;

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paper = await Papers.findOne({ id: paperId })
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
			.populate({ path: 'peer_review.assignedReviewers', model: 'User', select: 'firstName lastName email roles' })
			.lean()
			.exec();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		return json(paper);
	} catch (error) {
		console.error('Error fetching paper by id:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		await start_mongo();
		const user = locals.user;
		const paperId = params.id;

		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paper = await Papers.findOne({
			$or: [{ id: paperId }, { _id: paperId }]
		})
			.lean()
			.exec();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const authorization = await authorize(user, 'paper.edit', { paper });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		if (String(paper.status) !== 'draft') {
			return json({ error: 'Only drafts can be deleted.' }, { status: 409 });
		}

		const deleteResult = await Papers.deleteOne({
			_id: paper._id,
			status: 'draft'
		}).exec();

		if (!deleteResult.deletedCount) {
			return json(
				{ error: 'Draft could not be deleted because its status changed.' },
				{ status: 409 }
			);
		}

		const paperIds = [...new Set([paper.id, paper._id].filter(Boolean).map(String))];
		if (paperIds.length > 0) {
			await Users.updateMany(
				{ papers: { $in: paperIds } },
				{ $pull: { papers: { $in: paperIds } } }
			).exec();
		}

		return json({ success: true, deletedPaperId: String(paper.id || paper._id) });
	} catch (error) {
		console.error('Error deleting draft paper:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
