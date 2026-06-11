import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { NotificationService } from '$lib/services/NotificationService';
import Hubs from '$lib/db/models/Hub';
import Users from '$lib/db/models/User';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { resolveEffectiveHubRoles } from '$lib/server/authorization/effectiveHubRoles';

if (mongoose.models.EmailReviewerInvitation) {
	delete mongoose.models.EmailReviewerInvitation;
}

const EmailReviewerInvitation = mongoose.model(
	'EmailReviewerInvitation',
	EmailReviewerInvitationSchema
);

let transporter: nodemailer.Transporter | null = null;

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

function getTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter;

	if (!env.SMTP_USER || !env.SMTP_PASS) {
		return null;
	}

	const smtpPort = Number(env.SMTP_PORT || 587);
	transporter = nodemailer.createTransport({
		host: env.SMTP_HOST || 'smtp.gmail.com',
		port: smtpPort,
		secure: env.SMTP_SECURE === 'true' || smtpPort === 465,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});

	return transporter;
}

async function findUserByAnyId(userId: string | null | undefined) {
	if (!userId) return null;
	const id = String(userId);
	return Users.findOne({ $or: [{ _id: id }, { id }] }).lean();
}

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
		const manager = await findUserByAnyId(managerId);

		if (managerId) {
			const declineLabel = DECLINE_LABELS[category] || category;
			const detailsSuffix = reason ? ` Reason details: ${reason}` : '';

			try {
				await NotificationService.createNotification({
					user: managerId,
					type: 'hub_reviewer_declined',
					title: 'Reviewer Declined Email Invitation',
					content: `${invitation.email} declined the reviewer invitation for "${hub?.title || 'your hub'}". Reason: ${declineLabel}.${detailsSuffix}`,
					relatedHubId: String(invitation.hubId),
					actionUrl: '/notifications',
					priority: 'medium',
					metadata: {
						inviteeEmail: invitation.email,
						hubName: hub?.title || null,
						declineCategory: category,
						declineReason: reason || null,
						paperId: invitation.paperId || null,
						source: 'email_reviewer_invitation'
					}
				});
			} catch (notifyError) {
				console.error('Failed to create decline notification for manager:', notifyError);
			}

			try {
				const smtpTransporter = getTransporter();
				if (smtpTransporter && manager?.email) {
					await smtpTransporter.sendMail({
						from: `"SciLedger Team" <${env.SMTP_USER}>`,
						to: manager.email,
						subject: `Reviewer declined invitation - ${hub?.title || 'Hub'}`,
						html: `
							<p>Hello ${(manager.firstName || '').trim() || 'Hub Manager'},</p>
							<p>The invited reviewer <strong>${invitation.email}</strong> declined your invitation for the hub <strong>${hub?.title || 'your hub'}</strong>.</p>
							<p><strong>Reason:</strong> ${declineLabel}</p>
							${reason ? `<p><strong>Additional details:</strong> ${reason}</p>` : ''}
							${invitation.paperId ? `<p><strong>Paper reference:</strong> ${String(invitation.paperId)}</p>` : ''}
							<p>You can view this update in your SciLedger notifications.</p>
						`
					});
				}
			} catch (emailError) {
				console.error('Failed to send decline email copy to manager:', emailError);
			}
		}

		return {
			success: true
		};
	}
};
