import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Papers from '$lib/db/models/Paper';
import Hubs from '$lib/db/models/Hub';
import { start_mongo } from '$lib/db/mongooseConnection';
import { NotificationService } from '$lib/services/NotificationService';

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

		if (!paperDoc.hubId) {
			return json({ error: 'This paper is not associated with a hub' }, { status: 400 });
		}

		const hubDoc: any = await Hubs.findById(paperDoc.hubId).lean();
		if (!hubDoc) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const hubOwnerId = hubDoc.createdBy?._id || hubDoc.createdBy?.id || hubDoc.createdBy;
		if (hubOwnerId?.toString?.() !== user.id) {
			return json({ error: 'Only the hub owner can approve publication' }, { status: 403 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Publication approval is only valid after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'under negotiation') {
			return json({ error: 'Paper is not pending publication approval' }, { status: 400 });
		}

		paperDoc.status = 'published';
		paperDoc.updatedAt = new Date().toISOString();
		await paperDoc.save();

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

		return json({
			success: true,
			status: paperDoc.status,
			message: 'Paper approved and published'
		});
	} catch (error) {
		console.error('Error approving publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
