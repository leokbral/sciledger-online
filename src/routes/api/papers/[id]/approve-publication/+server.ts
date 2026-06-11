import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';
import { PaperLifecycleEmailService } from '$lib/services/PaperLifecycleEmailService';
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
			return json({ error: 'Publication approval is only valid after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'reviewer assignment') {
			return json({ error: 'Paper is not pending publication approval' }, { status: 400 });
		}

		const body = await request.json().catch(() => ({}));
		const doi = typeof body?.doi === 'string' ? body.doi.trim() : undefined;

		const updatedPaper: any = await transitionPaperStatus({
			user,
			paperId,
			action: 'paper.publish',
			expectedStatus: body.expectedStatus || paperDoc.status,
			extraSet: doi ? { doi } : {},
			metadata: {
				endpoint: '/api/papers/[id]/approve-publication',
				doi: doi || null
			}
		});
		paperDoc.status = updatedPaper.status;
		if (doi) paperDoc.doi = doi;

		try {
			await NotificationService.createNotification({
				user: paperDoc.mainAuthor,
				type: 'paper_published',
				title: 'Paper Published',
				content: `Your paper "${paperDoc.title}" has been approved and published by the hub admin.`,
				relatedPaperId: paperDoc.id,
				relatedHubId: paperDoc.hubId,
				actionUrl: `/publish/published/${paperDoc.id}`,
				priority: 'high'
			});
		} catch (notificationError) {
			console.error('Failed to create paper published notification:', notificationError);
		}

		try {
			const authorIds = [
				String(paperDoc.mainAuthor || ''),
				String(paperDoc.correspondingAuthor || ''),
				String(paperDoc.submittedBy || ''),
				...((paperDoc.coAuthors || []).map((id: string) => String(id)))
			].filter(Boolean);

			const hubOwnerName = `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim();

			await PaperLifecycleEmailService.sendPaperAcceptedEmail({
				paperId: String(paperDoc.id),
				paperTitle: String(paperDoc.title || 'Paper sem titulo'),
				authorIds,
				acceptedByName: hubOwnerName || undefined,
				acceptanceType: 'publication'
			});
		} catch (emailError) {
			console.error('Failed to send paper publication email:', emailError);
		}

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Paper approved and published'
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
		console.error('Error approving publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
