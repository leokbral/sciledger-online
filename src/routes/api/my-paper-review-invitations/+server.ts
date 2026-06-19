import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { serializeReviewInvitations } from '$lib/server/reviewInvitations';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		const { aliases } = await resolveUserIdentifiers(user);
		const reviewerAliases = aliases.length > 0 ? aliases : [String(user.id)];
		const invitationsRaw = await PaperReviewInvitation.find({
			$or: [
				{ reviewerId: { $in: reviewerAliases } },
				{ reviewer: { $in: reviewerAliases } }
			],
			status: { $ne: 'duplicate' }
		})
			.populate({
				path: 'paper',
				select: 'id title abstract hubId'
			})
			.populate({
				path: 'hubId',
				select: 'title type'
			})
			.sort({ createdAt: -1, invitedAt: -1 })
			.lean()
			.exec();

		const invitations = await serializeReviewInvitations(invitationsRaw);

		return json({ invitations });
	} catch (error) {
		console.error('Error fetching paper review invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
};
