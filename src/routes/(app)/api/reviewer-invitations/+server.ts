import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { NotificationService } from '$lib/services/NotificationService';
import { canManageHub, isHubOwner } from '$lib/helpers/hubPermissions';
import { start_mongo } from '$lib/db/mongooseConnection';

export async function POST({ request, locals }) {
	await start_mongo();

	try {
		const { hubId, reviewerId, role } = await request.json();
		const inviteRole = role === 'vice_manager' ? 'vice_manager' : 'reviewer';
		console.log('Received data:', { hubId, reviewerId, role: inviteRole });

		const hub = await Hubs.findById(hubId).populate('createdBy');
		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const inviter = locals.user;
		if (!inviter) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!canManageHub(hub, inviter.id)) {
			return json({ error: 'Only hub managers can send invitations' }, { status: 403 });
		}

		if (inviteRole === 'vice_manager' && !isHubOwner(hub, inviter.id)) {
			return json({ error: 'Only the hub owner can invite an Editor-in-chief' }, { status: 403 });
		}

		const reviewer = await Users.findOne({ $or: [{ id: reviewerId }, { _id: reviewerId }] })
			.select('_id id')
			.lean();
		if (!reviewer) {
			return json({ error: 'Reviewer not found' }, { status: 404 });
		}

		const { canonicalId, aliases } = await resolveUserIdentifiers(reviewer);
		const normalizedReviewerId = canonicalId || String(reviewerId);
		const reviewerLookupIds = aliases.length > 0 ? aliases : [normalizedReviewerId];

		const existingPending = await Invitation.findOne({
			reviewer: { $in: reviewerLookupIds },
			hubId,
			status: 'pending',
			role: inviteRole
		});
		if (existingPending) {
			return json(
				{ error: 'User already has a pending invitation for this role' },
				{ status: 409 }
			);
		}

		const id = crypto.randomUUID();
		const invitation = new Invitation({
			_id: id,
			id,
			reviewer: normalizedReviewerId,
			role: inviteRole,
			hubId,
			status: 'pending',
			assignedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await invitation.save();

		const inviterName =
			`${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email;
		await NotificationService.createHubInvitationNotification({
			userId: normalizedReviewerId,
			hubId: String(hubId),
			hubName: hub.title,
			inviterName,
			role: inviteRole === 'vice_manager' ? 'Editor-in-chief' : 'reviewer'
		});

		return json({ success: true, invitation });
	} catch (error) {
		console.error('Error creating invitation:', error);
		return json(
			{
				error: 'Failed to create invitation',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
}

export async function GET({ locals }) {
	await start_mongo();

	try {
		const user = locals.user;

		if (!user) {
			console.log('GET reviewer-invitations: No user in locals');
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('GET reviewer-invitations: Fetching for user', user.id);

		const { aliases } = await resolveUserIdentifiers(user);
		const reviewerQueryIds = aliases.length > 0 ? aliases : [user.id];

		const invitations = await Invitation.find({
			reviewer: { $in: reviewerQueryIds },
			status: 'pending'
		})
			.populate({
				path: 'hubId',
				select: 'title type description logoUrl createdBy assistantManagers'
			})
			.lean();

		const filteredInvitations = invitations.filter((inv: any) => {
			const hub = inv.hubId;
			const role = inv.role || 'reviewer';
			if (!hub || role !== 'vice_manager') return true;
			return !canManageHub(hub as any, user.id);
		});

		console.log('GET reviewer-invitations: Found', filteredInvitations.length, 'invitations');

		return json({ success: true, reviewerInvitations: filteredInvitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}
