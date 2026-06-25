import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await start_mongo();

		const user = locals.user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { paperId, reviewType = 'peer_review', expectedStatus } = await request.json();

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paper: any = await Papers.findOne({
			$or: [{ id: String(paperId) }, { _id: String(paperId) }]
		}).lean();

		if (!paper) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId: String(paper.id || paper._id),
			action: 'paper.sendToReview',
			expectedStatus: expectedStatus || String(paper.status),
			extraSet: {
				acceptedAt: new Date(),
				acceptedBy: user.id,
				reviewType
			},
			metadata: {
				endpoint: '/api/review/accept-paper',
				reviewType
			}
		});

		return json({
			success: true,
			message: 'Paper accepted for review successfully',
			paperId: String(paper.id || paper._id),
			status: updatedPaper.status
		});
	} catch (error) {
		if (error instanceof EditorialTransitionError) {
			return json(
				{
					success: false,
					error: error.message,
					code: error.code,
					currentStatus: error.currentStatus
				},
				{ status: error.status }
			);
		}

		console.error('Error accepting paper for review:', error);
		return json(
			{
				success: false,
				error: 'Failed to accept paper for review',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
