import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';
import Papers from '$lib/db/models/Paper';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import { sanitizePaper } from '$lib/helpers/sanitizePaper';
import { authorize } from '$lib/server/authorization/authorizationService';
import {
	getEffectiveHubMemberForUser,
	resolveEffectiveHubRoles
} from '$lib/server/authorization/effectiveHubRoles';
import {
	getIdAliases,
	serializeReviewInvitations
} from '$lib/server/reviewInvitations';

export const load: PageServerLoad = async ({ params, locals }) => {
	await start_mongo();

	const user = locals.user;
	if (!user) {
		redirect(302, '/auth/login');
	}

	const { id: hubId } = params;
	const hub = await Hubs.findById(hubId).lean();
	if (!hub) {
		redirect(302, '/hub');
	}

	const assignmentAuthorization = await authorize(user, 'paper.assignReviewers', { hub });
	if (!assignmentAuthorization.allowed) {
		redirect(302, `/hub/view/${hubId}`);
	}

	const effectiveRoles = await resolveEffectiveHubRoles(hub);
	const currentUserHubMember = getEffectiveHubMemberForUser(effectiveRoles, user);
	const primaryRole = currentUserHubMember?.primaryRoleKey ?? null;
	const canViewAllInvitations = primaryRole === 'HubOwner' || primaryRole === 'EditorChief';

	const invitationsRaw = await PaperReviewInvitation.find({
		hubId
	})
		.populate('paper')
		.populate('reviewer')
		.sort({ createdAt: -1, invitedAt: -1 })
		.lean();

	const userAliases = getIdAliases(user);
	let manageablePaperIds = new Set<string>();

	if (!canViewAllInvitations) {
		const hubPapers = await Papers.find({
			hubId,
			status: { $ne: 'draft' }
		})
			.select('_id id hubId status')
			.lean();

		manageablePaperIds = new Set(
			(hubPapers as any[]).flatMap((paper) => getIdAliases(paper)).filter(Boolean)
		);
	}

	const serializedAllInvitations = await serializeReviewInvitations(invitationsRaw as any[]);
	const invitationsById = new Map(
		serializedAllInvitations.flatMap((invitation) => [
			[invitation.id, invitation],
			[invitation._id, invitation]
		])
	);
	const visibleInvitations = canViewAllInvitations
		? serializedAllInvitations
		: serializedAllInvitations.filter((invitation) => {
				const inviterId = invitation.invitedBy?.userId || '';
				const paperId = invitation.paperId || '';
				return userAliases.includes(inviterId) || manageablePaperIds.has(paperId);
			});

	const invitations = visibleInvitations.map((invitation) => ({
		...invitation,
		paper: invitation.paper ? sanitizePaper(invitation.paper) : null,
		duplicateOfInvitation: invitation.duplicateOf
			? invitationsById.get(invitation.duplicateOf) ?? null
			: null
	}));

	return {
		hub,
		isCreator: primaryRole === 'HubOwner',
		currentRole: primaryRole,
		canViewAllInvitations,
		invitations,
		reviewers: effectiveRoles.reviewers || []
	};
};
