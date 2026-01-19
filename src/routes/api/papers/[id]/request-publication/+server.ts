import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';

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

export const POST: RequestHandler = async ({ params, locals }) => {
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

		// If there is no hub, publish immediately
		if (!paperDoc.hubId) {
			paperDoc.status = 'published';
			paperDoc.updatedAt = new Date().toISOString();
			await paperDoc.save();

			try {
				await NotificationService.createNotification({
					user: paperDoc.mainAuthor,
					type: 'paper_published',
					title: 'Paper Published',
					content: `Your paper "${paperDoc.title}" has been published.`,
					relatedPaperId: paperDoc.id,
					actionUrl: `/publish/published/${paperDoc.id}`,
					priority: 'high'
				});
			} catch (notificationError) {
				console.error('Failed to create paper published notification:', notificationError);
			}

			return json({
				success: true,
				status: paperDoc.status,
				message: 'Paper published successfully'
			});
		}

		// Hub paper: request approval from hub admin (hub owner)
		paperDoc.status = 'under negotiation';
		paperDoc.updatedAt = new Date().toISOString();
		await paperDoc.save();

		const hubDoc: any = await Hubs.findById(paperDoc.hubId).lean();
		const hubOwnerId = hubDoc?.createdBy?._id || hubDoc?.createdBy?.id || hubDoc?.createdBy;

		if (hubOwnerId) {
			try {
				await NotificationService.createNotification({
					user: hubOwnerId.toString(),
					type: 'hub_paper_pending',
					title: 'Publication Approval Requested',
					content: `The author requested publication approval for the paper "${paperDoc.title}".`,
					relatedPaperId: paperDoc.id,
					relatedHubId: paperDoc.hubId,
					actionUrl: `/publish/publication-approval/${paperDoc.id}`,
					priority: 'high',
					metadata: {
						paperTitle: paperDoc.title,
						reviewRound: paperDoc.reviewRound,
						requestType: 'publication'
					}
				});
			} catch (notificationError) {
				console.error('Failed to create hub approval notification:', notificationError);
			}
		}

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Publication request sent to hub admin'
		});
	} catch (error) {
		console.error('Error requesting publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
