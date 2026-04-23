import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { json } from '@sveltejs/kit';
import { NotificationService } from '$lib/services/NotificationService';
import { start_mongo } from '$lib/db/mongooseConnection';

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
		const saveRes = await invitation.save();
		console.log('Invitation updated:', saveRes);

		const reviewerName =
			`${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() || reviewer.email;

		if (action === 'accept') {
			if (!hub.reviewers) hub.reviewers = [];
			if (!hub.reviewers.includes(normalizedReviewerId)) {
				hub.reviewers.push(normalizedReviewerId);
			}

			if (acceptedRole === 'vice_manager') {
				if (!hub.assistantManagers) hub.assistantManagers = [];
				if (!hub.assistantManagers.includes(normalizedReviewerId)) {
					hub.assistantManagers.push(normalizedReviewerId);
				}
			}

			await hub.save();

			await NotificationService.createNotification({
				user: String(hub.createdBy),
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
			});
		} else {
			await NotificationService.createNotification({
				user: String(hub.createdBy),
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
			});
		}

		await Invitation.findByIdAndDelete(inviteId);
		console.log('Invitation deleted:', inviteId);

		return json({ success: true });
	} catch (error) {
		console.error('Error processing invitation response:', error);
		return json({ error: 'Failed to process invitation' }, { status: 500 });
	}
}
