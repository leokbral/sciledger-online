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
			return json({ error: 'Only the hub owner can reject publication' }, { status: 403 });
		}

		if (paperDoc.reviewRound !== 2) {
			return json({ error: 'Publication decision is only valid after round 2' }, { status: 400 });
		}

		if (paperDoc.status !== 'under negotiation') {
			return json({ error: 'Paper is not pending publication approval' }, { status: 400 });
		}

		// Return the paper to author correction state
		paperDoc.status = 'needing corrections';
		paperDoc.updatedAt = new Date().toISOString();
		await paperDoc.save();

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
		console.error('Error rejecting publication:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
