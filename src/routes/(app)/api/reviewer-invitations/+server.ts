import Invitation from '$lib/db/models/Invitation';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import { resolveUserIdentifiers } from '$lib/helpers/userIdentifiers';
import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import { emitEvent } from '$lib/services/EventService';
import { start_mongo } from '$lib/db/mongooseConnection';
import { authorize } from '$lib/server/authorization/authorizationService';

export async function POST({ request, locals }) {
	await start_mongo();

	try {
		const { hubId, reviewerId, role } = await request.json();
		const inviteRole = role === 'vice_manager' ? 'vice_manager' : 'reviewer';

		const hub = await Hubs.findById(hubId);
		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const inviter = locals.user;
		if (!inviter) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const requiredPermission = inviteRole === 'vice_manager' ? 'hub.manageEditors' : 'hub.manageMembers';
		const authorization = await authorize(inviter, requiredPermission, { hub });
		if (!authorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: authorization.reason },
				{ status: 403 }
			);
		}

		const reviewer = await Users.findOne({ $or: [{ id: reviewerId }, { _id: reviewerId }] })
			.select('_id id firstName lastName email')
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
		const inviteeName =
			`${reviewer.firstName || ''} ${reviewer.lastName || ''}`.trim() ||
			reviewer.email ||
			'Invitee';
		const recipients = [...new Set([normalizedReviewerId, String(inviter.id)].filter(Boolean))];
		try {
			await emitEvent({
				type: 'hub.invitation.created',
				actorId: inviter.id,
				recipients,
				entityType: 'hub',
				entityId: String(hubId),
				metadata: {
					hubId: String(hubId),
					hubName: hub.title,
					invitationId: String(invitation.id || invitation._id),
					inviteeId: normalizedReviewerId,
					inviteeName,
					inviterId: inviter.id,
					inviterName,
					role: inviteRole === 'vice_manager' ? 'Editor-in-chief' : 'reviewer',
					recipientRoles: Object.fromEntries(
						recipients.map((recipientId) => [
							recipientId,
							recipientId === normalizedReviewerId ? 'invitee' : 'inviter'
						])
					)
				}
			});
		} catch (eventError) {
			console.error('Failed to emit hub invitation created event:', eventError);
		}

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

export async function GET({ locals, url }) {
	await start_mongo();

	try {
		const user = locals.user;

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const hubId = url.searchParams.get('hubId');
		if (hubId) {
			const hub = await Hubs.findById(hubId).lean();
			if (!hub) {
				return json({ error: 'Hub not found' }, { status: 404 });
			}

			const authorization = await authorize(user, 'hub.manageMembers', { hub });
			if (!authorization.allowed) {
				return json(
					{ error: 'Insufficient permissions', reason: authorization.reason },
					{ status: 403 }
				);
			}

			const invites = await Invitation.find({
				hubId,
				status: 'pending'
			})
				.populate({
					path: 'reviewer',
					select: '_id id firstName lastName email profilePictureUrl profilePicture'
				})
				.lean();

			return json({ success: true, invites });
		}

		const { aliases } = await resolveUserIdentifiers(user);
		const reviewerQueryIds = aliases.length > 0 ? aliases : [user.id];

		const invitations = await Invitation.find({
			reviewer: { $in: reviewerQueryIds },
			status: 'pending'
		})
			.populate({
				path: 'hubId',
				select: 'title type description logoUrl'
			})
			.lean();

		const filteredInvitations = (
			await Promise.all(
				invitations.map(async (inv: any) => {
					const hub = inv.hubId;
					const role = inv.role || 'reviewer';
					if (!hub || role !== 'vice_manager') return inv;
					const authorization = await authorize(user, 'hub.manageEditors', { hub });
					return authorization.allowed ? null : inv;
				})
			)
		).filter(Boolean);

		return json({ success: true, reviewerInvitations: filteredInvitations });
	} catch (error) {
		console.error('Error fetching invitations:', error);
		return json({ error: 'Failed to fetch invitations' }, { status: 500 });
	}
}
