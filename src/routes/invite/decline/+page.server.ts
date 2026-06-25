import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { emitEvent } from '$lib/services/EventService';
import Hubs from '$lib/db/models/Hub';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';

if (mongoose.models.EmailReviewerInvitation) {
	delete mongoose.models.EmailReviewerInvitation;
}

const EmailReviewerInvitation = mongoose.model(
	'EmailReviewerInvitation',
	EmailReviewerInvitationSchema
);

const DECLINE_CATEGORIES = [
	'lack_of_time',
	'conflict_of_interest',
	'outside_expertise',
	'already_overloaded',
	'other'
] as const;

type DeclineCategory = (typeof DECLINE_CATEGORIES)[number];

const DECLINE_LABELS: Record<DeclineCategory, string> = {
	lack_of_time: 'Lack of time',
	conflict_of_interest: 'Conflict of interest',
	outside_expertise: 'Outside expertise',
	already_overloaded: 'Already overloaded',
	other: 'Other'
};

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			valid: false,
			error: 'Invalid invitation token.'
		};
	}

	await start_mongo();

	const invitation = await EmailReviewerInvitation.findOne({ token }).lean();

	if (!invitation) {
		return {
			valid: false,
			error: 'This invitation is no longer valid.'
		};
	}

	if (new Date() > new Date(invitation.expiresAt)) {
		await EmailReviewerInvitation.updateOne(
			{ _id: invitation._id, status: 'pending' },
			{ status: 'expired', updatedAt: new Date() }
		);
		return {
			valid: false,
			error: 'This invitation has expired.'
		};
	}

	if (invitation.status !== 'pending') {
		return {
			valid: false,
			error:
				invitation.status === 'declined'
					? 'This invitation has already been declined.'
					: 'This invitation has already been processed.'
		};
	}

	return {
		valid: true,
		token,
		email: invitation.email,
		hubId: invitation.hubId,
		paperId: invitation.paperId || null,
		categories: DECLINE_CATEGORIES
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const token = String(formData.get('token') || '').trim();
		const category = String(formData.get('category') || '').trim() as DeclineCategory;
		const reason = String(formData.get('reason') || '').trim();

		if (!token) {
			return fail(400, { error: 'Missing invitation token.' });
		}

		if (!DECLINE_CATEGORIES.includes(category)) {
			return fail(400, { error: 'Please select a reason for declining.' });
		}

		if (reason.length > 1000) {
			return fail(400, { error: 'Reason is too long (max 1000 characters).' });
		}

		await start_mongo();

		const invitation = await EmailReviewerInvitation.findOne({ token });
		if (!invitation) {
			return fail(404, { error: 'Invalid invitation token.' });
		}

		if (new Date() > new Date(invitation.expiresAt)) {
			if (invitation.status === 'pending') {
				invitation.status = 'expired';
				invitation.updatedAt = new Date();
				await invitation.save();
			}
			return fail(410, { error: 'This invitation has expired.' });
		}

		if (invitation.status !== 'pending') {
			return fail(400, { error: 'This invitation has already been processed.' });
		}

		invitation.status = 'declined';
		invitation.declineCategory = category;
		invitation.declineReason = reason || null;
		invitation.declinedAt = new Date();
		invitation.updatedAt = new Date();
		await invitation.save();

		const hub = await Hubs.findById(String(invitation.hubId)).lean();
		let managerId = String(invitation.invitedBy || '');
		if (!managerId && hub) {
			const effectiveHubRoles = await resolveEffectiveHubRoles(hub);
			managerId =
				effectiveHubRoles.members.find((member) => member.primaryRoleKey === 'HubOwner')?.userId ||
				'';
		}
		if (managerId) {
			const declineLabel = DECLINE_LABELS[category] || category;

			try {
				await emitEvent({
					type: 'hub.invitation.declined',
					actorId: null,
					recipients: [managerId],
					entityType: 'hub',
					entityId: String(invitation.hubId),
					metadata: {
						hubId: String(invitation.hubId),
						hubName: hub?.title || null,
						inviteeEmail: invitation.email,
						inviteeName: invitation.email,
						declineCategory: category,
						declineLabel,
						declineReason: reason || null,
						paperId: invitation.paperId || null,
						source: 'email_reviewer_invitation',
						recipientRoles: {
							[managerId]: 'manager'
						}
					}
				});
			} catch (eventError) {
				console.error('Failed to emit hub invitation declined event:', eventError);
			}
		}

		return {
			success: true
		};
	}
};
