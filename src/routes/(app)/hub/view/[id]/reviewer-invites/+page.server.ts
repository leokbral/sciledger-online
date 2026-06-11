import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	getEffectiveHubMemberForUser,
	resolveEffectiveHubRoles
} from '$lib/server/authorization/effectiveHubRoles';

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

	// Verificar se o usuário é manager do hub (owner ou vice)
	const authorization = await authorize(user, 'hub.manageMembers', { hub });
	const isManager = authorization.allowed;
	if (!isManager) {
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
	const effectiveRoles = await resolveEffectiveHubRoles(hub);
	const currentUserHubMember = getEffectiveHubMemberForUser(effectiveRoles, user);

	return {
		hub,
		isCreator: currentUserHubMember?.primaryRoleKey === 'HubOwner',
		invitations: sanitizedInvitations || [],
		reviewers: effectiveRoles.reviewers || []
	};
};
