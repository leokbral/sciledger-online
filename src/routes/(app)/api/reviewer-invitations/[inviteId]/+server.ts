import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { json } from '@sveltejs/kit';
import { NotificationService } from '$lib/services/NotificationService';
import { start_mongo } from '$lib/db/mongooseConnection';
import { assignHighestHubRole } from '$lib/server/authorization/roleAssignmentService';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';

export async function POST({ params, request, locals }) {
	await start_mongo();

	try {
		const user = locals.user;
		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { action } = await request.json();
		const { inviteId } = params;

		if (!action || !['accept', 'decline'].includes(action)) {
			return json({ error: 'Invalid action' }, { status: 400 });
		}

		const invitation = await Invitation.findById(inviteId).populate('hubId');
		if (!invitation) {
			return json({ error: 'Invitation not found' }, { status: 404 });
		}

		const { canonicalId, aliases: invitationReviewerAliases } = await resolveUserIdentifiers(
			invitation.reviewer as any
		);
		const currentUserAliases = [String(user.id || ''), String(user._id || '')].filter(Boolean);

		if (!currentUserAliases.some((alias) => invitationReviewerAliases.includes(alias))) {
			return json({ error: 'This invitation is not for the current user' }, { status: 403 });
		}

		const hub = await Hubs.findById(invitation.hubId);
		const reviewerLookupIds =
			invitationReviewerAliases.length > 0
				? invitationReviewerAliases
				: [String(invitation.reviewer)];
		const reviewer = await Users.findOne({
			$or: reviewerLookupIds.flatMap((alias) => [{ id: alias }, { _id: alias }])
		});

		if (!hub || !reviewer) {
			return json({ error: 'Hub or reviewer not found' }, { status: 404 });
		}

		const normalizedReviewerId = canonicalId || String(invitation.reviewer);
		const acceptedRole = invitation.role || 'reviewer';

		invitation.status = action === 'accept' ? 'accepted' : 'declined';
		invitation.respondedAt = new Date();
		await invitation.save();

		const reviewerName =
			`${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;
		const effectiveHubRoles = await resolveEffectiveHubRoles(hub);
		const hubOwnerIds = effectiveHubRoles.members
			.filter((member) => member.primaryRoleKey === 'HubOwner')
			.map((member) => member.userId);

		if (action === 'accept') {
			await assignHighestHubRole(
				normalizedReviewerId,
				String(hub.id || hub._id),
				acceptedRole === 'vice_manager' ? 'EditorChief' : 'Reviewer',
				String(user.id || user._id || 'hub-invitation'),
				{ auditUser: user }
			);

			await Promise.all(
				hubOwnerIds.map((hubOwnerId) =>
					NotificationService.createNotification({
						user: hubOwnerId,
						type: 'hub_reviewer_accepted',
						title: 'Reviewer Accepted Invitation',
						content: `${reviewerName} accepted the invitation as ${acceptedRole === 'vice_manager' ? 'Editor-in-chief' : 'reviewer'} for "${hub.title}"`,
						relatedHubId: String(invitation.hubId),
						actionUrl: `/notifications`,
						priority: 'medium',
						metadata: {
							reviewerName,
							reviewerId: normalizedReviewerId,
							hubName: hub.title,
							role: acceptedRole
						}
					})
				)
			);
		} else {
			await Promise.all(
				hubOwnerIds.map((hubOwnerId) =>
					NotificationService.createNotification({
						user: hubOwnerId,
						type: 'hub_reviewer_declined',
						title: 'Reviewer Declined Invitation',
						content: `${reviewerName} has declined the invitation to review for "${hub.title}"`,
						relatedHubId: String(invitation.hubId),
						actionUrl: `/notifications`,
						priority: 'low',
						metadata: {
							reviewerName,
							reviewerId: normalizedReviewerId,
							hubName: hub.title,
							role: acceptedRole
						}
					})
				)
			);
		}

		await Invitation.findByIdAndDelete(inviteId);

		return json({ success: true });
	} catch (error) {
		console.error('Error processing invitation response:', error);
		return json({ error: 'Failed to process invitation' }, { status: 500 });
	}
}
