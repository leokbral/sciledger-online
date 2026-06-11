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

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Withdraw is only available after round 2' }, { status: 400 });
		}

		if (!['needing corrections', 'under correction', 'reviewer assignment'].includes(paperDoc.status)) {
			return json({ error: 'Paper cannot be withdrawn in its current status' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));
		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.withdraw',
			expectedStatus: body.expectedStatus || paperDoc.status,
			extraSet: {
				hubId: null,
				isLinkedToHub: false
			},
			metadata: {
				endpoint: '/api/papers/[id]/withdraw-publication'
			}
		});

		return json({
			success: true,
			status: updatedPaper.status,
			message: 'Paper withdrawn from publication'
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
		console.error('Error withdrawing publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
