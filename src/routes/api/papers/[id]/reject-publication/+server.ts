import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';
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

		if (!paperDoc.hubId) {
			return json({ error: 'This paper is not associated with a hub' }, { status: 400 });
		}

		const hubDoc: any = await Hubs.findById(paperDoc.hubId).lean();
		if (!hubDoc) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Publication decision is only valid after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'reviewer assignment') {
			return json({ error: 'Paper is not pending publication approval' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));

		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.rejectPublication',
			expectedStatus: body.expectedStatus || paperDoc.status,
			metadata: {
				endpoint: '/api/papers/[id]/reject-publication',
				rejectionReason: body.rejectionReason || null
			}
		});
		paperDoc.status = updatedPaper.status;

		try {
			await NotificationService.createNotification({
				user: paperDoc.mainAuthor,
				type: 'paper_final_rejection',
				title: 'Publication Rejected',
				content: `The hub admin rejected publication for your paper "${paperDoc.title}". You can make further corrections or withdraw.`,
				relatedPaperId: paperDoc.id,
				relatedHubId: paperDoc.hubId,
				actionUrl: `/publish/corrections/${paperDoc.id}`,
				priority: 'high'
			});
		} catch (notificationError) {
			console.error('Failed to create publication rejected notification:', notificationError);
		}

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Publication rejected'
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
		console.error('Error rejecting publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
