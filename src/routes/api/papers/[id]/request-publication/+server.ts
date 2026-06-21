import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import { start_mongo } from '$lib/db/mongooseConnection';
import {
	EditorialTransitionError,
	transitionPaperStatus
} from '$lib/server/authorization/editorialTransitionService';

function isAuthorOfPaper(paper: any, userId: string): boolean {
	if (!paper || !userId) return false;
	if (paper.mainAuthor?.toString?.() === userId) return true;
	if (paper.correspondingAuthor?.toString?.() === userId) return true;
	if (paper.submittedBy?.toString?.() === userId) return true;
	if (Array.isArray(paper.coAuthors) && paper.coAuthors.some((id: any) => id?.toString?.() === userId)) {
		return true;
	}
	return false;
}

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

		if (!isAuthorOfPaper(paperDoc, user.id)) {
			return json({ error: 'You do not have permission to request publication for this paper' }, { status: 403 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Publication request is only allowed after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'needing corrections' && paperDoc.status !== 'under correction') {
			return json({ error: 'Paper is not in the author correction phase' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));

		// If there is no hub, publish immediately
		if (!paperDoc.hubId) {
			const updatedPaper: any = await transitionPaperStatus({
				user,
				paperId,
				action: 'paper.publishStandalone',
				expectedStatus: body.expectedStatus || paperDoc.status,
				metadata: {
					endpoint: '/api/papers/[id]/request-publication',
					standalone: true
				}
			});
			paperDoc.status = updatedPaper.status;

			return json({
				success: true,
				status: paperDoc.status,
				message: 'Paper published successfully'
			});
		}

		// Hub paper: request approval from hub admin (hub owner)
		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.requestPublication',
			expectedStatus: body.expectedStatus || paperDoc.status,
			metadata: {
				endpoint: '/api/papers/[id]/request-publication',
				hubId: String(paperDoc.hubId)
			}
		});
		paperDoc.status = updatedPaper.status;

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Publication request sent to hub admin'
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
		console.error('Error requesting publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
