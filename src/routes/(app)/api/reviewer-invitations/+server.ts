import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { NotificationService } from '$lib/services/NotificationService';

export async function POST({ request, locals }) {
	try {
		const { hubId, reviewerId } = await request.json();
		console.log('Received data:', { hubId, reviewerId });

		// Get hub and inviter information
		const hub = await Hubs.findById(hubId).populate('createdBy');
		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const inviter = locals.user;
		if (!inviter) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const id = crypto.randomUUID();

		const invitation = new Invitation({
			_id: id,
			id,
			reviewer: reviewerId,
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
			role: 'reviewer'
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
				select: 'title type description logoUrl createdBy'
			})
			.lean();

		console.log('GET reviewer-invitations: Found', invitations.length, 'invitations');

		return json({ success: true, reviewerInvitations: invitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}
