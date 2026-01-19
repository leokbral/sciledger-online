import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';

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
