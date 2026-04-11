import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { NotificationService } from '$lib/services/NotificationService';
import { canManageHub, isHubOwner, normalizeId } from '$lib/helpers/hubPermissions';

export async function POST({ request, locals }) {
	try {
		const { hubId, reviewerId, role } = await request.json();
		const inviteRole = role === 'vice_manager' ? 'vice_manager' : 'reviewer';
		console.log('Received data:', { hubId, reviewerId, role: inviteRole });

		// Get hub and inviter information
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
			return json({ error: 'Only the hub owner can invite a vice manager' }, { status: 403 });
		}

		const existingPending = await Invitation.findOne({
			reviewer: reviewerId,
			hubId,
			status: 'pending',
			role: inviteRole
		});
		if (existingPending) {
			return json({ error: 'User already has a pending invitation for this role' }, { status: 409 });
		}

		const id = crypto.randomUUID();

		const invitation = new Invitation({
			_id: id,
			id,
			reviewer: reviewerId,
			role: inviteRole,
			hubId,
			status: 'pending',
			assignedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		await invitation.save();

		// Create notification for the invited reviewer
		const inviterName = `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email;
		await NotificationService.createHubInvitationNotification({
			userId: reviewerId,
			hubId: String(hubId),
			hubName: hub.title,
			inviterName: inviterName,
			role: inviteRole === 'vice_manager' ? 'vice manager' : 'reviewer'
		});

		return json({ success: true, invitation });
	} catch (error) {
		console.error('Error creating invitation:', error);
		return json({
			error: 'Failed to create invitation',
			details: error instanceof Error ? error.message : String(error)
		}, { status: 500 });
	}
}

export async function GET({ locals }) {
	try {
		const user = locals.user;

		if (!user) {
			console.log('GET reviewer-invitations: No user in locals');
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('GET reviewer-invitations: Fetching for user', user.id);

		// Populate hub information for better display
		const invitations = await Invitation.find({ reviewer: user.id, status: 'pending' })
			.populate({
				path: 'hubId',
				select: 'title type description logoUrl createdBy assistantManagers'
			})
			.lean();

		const filteredInvitations = invitations.filter((inv: any) => {
			const hub = inv.hubId;
			const role = inv.role || 'reviewer';
			if (!hub) return true;
			if (role !== 'vice_manager') return true;
			return !isHubOwner(hub as any, user.id) && !canManageHub(hub as any, user.id);
		});

		console.log('GET reviewer-invitations: Found', filteredInvitations.length, 'invitations');

		return json({ success: true, reviewerInvitations: filteredInvitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}
