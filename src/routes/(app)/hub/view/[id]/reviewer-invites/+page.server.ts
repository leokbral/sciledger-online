import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';

export const load: PageServerLoad = async ({ params, locals }) => {
	await start_mongo();

	const user = locals.user;
	if (!user) {
		redirect(302, '/auth/login');
	}

	const { id: hubId } = params;

	// Carregar hub
	const hub = await Hubs.findById(hubId).lean();
	if (!hub) {
		redirect(302, '/hub');
	}

	// Verificar se o usuário é criador do hub
	const isCreator = hub.createdBy === user.id || (typeof hub.createdBy === 'object' && hub.createdBy._id === user.id);
	if (!isCreator) {
		redirect(302, `/hub/view/${hubId}`);
	}

	// Carregar convites pendentes
	const invitations = await PaperReviewInvitation.find({
		hubId: hubId,
		status: 'pending'
	})
		.populate('paper')
		.populate('reviewer')
		.lean();

	// Sanitizar papers para remover ObjectIds não-serializáveis
	const sanitizedInvitations = invitations.map(inv => ({
		...inv,
		paper: inv.paper ? sanitizePaper(inv.paper) : null
	}));

	// Carregar revisores do hub
	const reviewerIds = hub.reviewers || [];
	const reviewers = await Users.find({ _id: { $in: reviewerIds } }).lean();

	return {
		hub,
		isCreator,
		invitations: sanitizedInvitations || [],
		reviewers: reviewers || []
	};
};
