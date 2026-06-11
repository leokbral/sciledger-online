import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	try {
		await start_mongo();
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const paperId = params.id;

		if (!paperId) {
			return json({ error: 'Paper ID is required' }, { status: 400 });
		}

		const paperDoc: any = await Papers.findOne({ id: paperId });
		if (!paperDoc) {
			return json({ error: 'Paper not found' }, { status: 404 });
		}

		// Only allow transition from corrections to second review round
		if (paperDoc.status !== 'needing corrections' && paperDoc.status !== 'under correction') {
			return json({ error: 'Paper is not in corrections phase' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));

		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.submitFinalReview',
			expectedStatus: body.expectedStatus || paperDoc.status,
			metadata: {
				endpoint: '/api/papers/[id]/submit-final-review'
			}
		});

		return json({ 
			success: true, 
			status: updatedPaper.status,
			reviewRound: updatedPaper.reviewRound,
			message: 'Paper submitted for second review round'
		});
	} catch (error) {
		if (error instanceof EditorialTransitionError) {
			return json(
				{
					error: error.message,
					code: error.code,
					currentStatus: error.currentStatus
				},
				{ status: error.status }
			);
		}
		console.error('Error moving paper to final review:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
