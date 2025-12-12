import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Invitations from '$lib/db/models/Invitation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'User not authenticated' }, { status: 401 });
		}

		// Buscar convites pendentes de revisão de papers
		const invitations = await Invitations.find({
			reviewer: user.id,
			status: 'pending',
			type: 'paper_review'
		})
			.populate('paper')
			.populate('invitedBy')
			.populate('hubId')
			.lean()
			.exec();

		return json({
			invitations
		});
	} catch (error) {
		console.error('Error fetching paper review invitations:', error);
		return json(
			{ error: 'Failed to fetch invitations' },
			{ status: 500 }
		);
	}
};
