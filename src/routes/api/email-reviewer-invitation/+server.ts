import 'dotenv/config';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { HubSchema } from '$lib/db/schemas/HubSchema.js';
import Papers from '$lib/db/models/Paper';
import PaperReviewInvitation from '$lib/db/models/PaperReviewInvitation';
import Users from '$lib/db/models/User';
import * as crypto from 'crypto';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { authorize } from '$lib/server/authorization/authorizationService';
import { emitEvent } from '$lib/services/EventService';
import type { EventRecipient } from '$lib/types/EventService';
import { emitPaperReviewInvitationEvent } from '$lib/server/reviewInvitationLifecycle';
import {
	buildDuplicateInvitationDetails,
	findActiveReviewInvitation,
	getIdAliases,
	selectInvitationRole
} from '$lib/server/reviewInvitations';
import {
	REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
	validateReviewerCanReviewPaper
} from '$lib/server/reviewConflictOfInterest';
import { buildReviewerInvitationEmailHtml } from '$lib/services/platformEmailTemplates';

// Clear the model cache to ensure we use the updated schema
if (mongoose.models.EmailReviewerInvitation) {
	delete mongoose.models.EmailReviewerInvitation;
}

const EmailReviewerInvitation = mongoose.model(
	'EmailReviewerInvitation',
	EmailReviewerInvitationSchema
);
const Hub = mongoose.models.Hub || mongoose.model('Hub', HubSchema);

let transporter: nodemailer.Transporter | null = null;

function getMissingSmtpConfig(): string[] {
	return ['SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]?.trim());
}

function getTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter;

	const smtpUser = process.env.SMTP_USER;
	const smtpPass = process.env.SMTP_PASS;

	if (!smtpUser || !smtpPass) {
		return null;
	}

	const smtpPort = Number(process.env.SMTP_PORT || 587);
	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: smtpPort,
		secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass
		}
	});

	return transporter;
}

function getSiteUrl(requestUrl: URL): string {
	const configuredSiteUrl = process.env.SITE_URL || process.env.PUBLIC_SITE_URL;
	const baseUrl = configuredSiteUrl?.trim() || requestUrl.origin;
	return baseUrl.replace(/\/+$/, '');
}

function getEmailSendErrorMessage(error: unknown): string {
	const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

	if (code === 'EAUTH') {
		return 'Email service authentication failed';
	}

	if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET'].includes(code)) {
		return 'Email service could not connect to the SMTP server';
	}

	return 'Failed to send invitation';
}

function getUserId(user: any): string | null {
	const id = user?.id || user?._id;
	return id ? String(id) : null;
}

function getUserDisplayName(user: any, fallback: string) {
	return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || fallback;
}

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = value.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (email.length > 254 || !emailRegex.test(email)) {
		return null;
	}

	return email;
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		await start_mongo();

		const inviterId = getUserId(locals.user);
		if (!inviterId) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { email, hubId, paperId, customDeadlineDays } = await request.json();

		// Validate input
		if (!email || !hubId) {
			return json({ error: 'Email and hubId are required' }, { status: 400 });
		}

		const hubIdValue = String(hubId);
		const normalizedEmail = normalizeEmail(email);
		if (!normalizedEmail) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Get hub details
		const hub = await Hub.findById(hubIdValue);

		if (!hub) {
			return json({ error: 'Hub not found' }, { status: 404 });
		}

		const hubAuthorization = await authorize(locals.user, 'hub.manageMembers', { hub });
		if (!hubAuthorization.allowed) {
			return json(
				{ error: 'Insufficient permissions', reason: hubAuthorization.reason },
				{ status: 403 }
			);
		}

		let paper: any = null;
		let paperIdValue: string | null = null;
		let deadlineDays: number | null = null;
		let invitedByRole = 'Member';

		if (customDeadlineDays !== undefined && customDeadlineDays !== null) {
			const parsed = Number(customDeadlineDays);
			if (!Number.isFinite(parsed) || parsed < 1 || parsed > 90) {
				return json({ error: 'Invalid custom deadline days' }, { status: 400 });
			}
			deadlineDays = Math.round(parsed);
		}
		if (paperId) {
			paperIdValue = String(paperId);
			paper = await Papers.findOne({ id: paperIdValue }).lean();
			if (!paper) {
				return json({ error: 'Paper not found' }, { status: 404 });
			}
			const paperHubId =
				typeof paper.hubId === 'object' ? paper.hubId?._id || paper.hubId?.id : paper.hubId;
			if (paperHubId && String(paperHubId) !== hubIdValue) {
				return json({ error: 'Paper does not belong to this hub' }, { status: 400 });
			}

			const paperAuthorization = await authorize(locals.user, 'paper.assignReviewers', { paper });
			if (!paperAuthorization.allowed) {
				return json(
					{ error: 'Insufficient permissions', reason: paperAuthorization.reason },
					{ status: 403 }
				);
			}
			invitedByRole = selectInvitationRole(paperAuthorization.roleKeys);

			const existingReviewer = await Users.findOne({ email: normalizedEmail }).lean();
			if (existingReviewer) {
				const conflictValidation = validateReviewerCanReviewPaper(paper, existingReviewer);
				if (!conflictValidation.allowed) {
					const normalizedReviewerId = String(existingReviewer.id || existingReviewer._id);
					return json(
						{
							success: false,
							error: REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
							message: REVIEW_CONFLICT_OF_INTEREST_MESSAGE,
							skipped: [
								{
									reviewerId: normalizedReviewerId,
									reasons: [REVIEW_CONFLICT_OF_INTEREST_MESSAGE]
								}
							]
						},
						{ status: 403 }
					);
				}

				const reviewerAliases = getIdAliases(existingReviewer);
				const normalizedPaperId = String(paperIdValue);
				const existingInvite = await findActiveReviewInvitation(
					[normalizedPaperId],
					reviewerAliases
				);
				if (existingInvite) {
					const duplicateId = crypto.randomUUID();
					const normalizedReviewerId = String(existingReviewer.id || existingReviewer._id);
					const duplicateInvitation = new PaperReviewInvitation({
						_id: duplicateId,
						id: duplicateId,
						paperId: normalizedPaperId,
						paper: normalizedPaperId,
						reviewerId: normalizedReviewerId,
						reviewer: normalizedReviewerId,
						invitedBy: {
							userId: inviterId,
							role: invitedByRole
						},
						hubId: hubIdValue,
						status: 'duplicate',
						duplicateOf: String(existingInvite.id || existingInvite._id),
						customDeadlineDays: deadlineDays || 15,
						invitedAt: new Date(),
						createdAt: new Date()
					});
					await duplicateInvitation.save();
					await emitPaperReviewInvitationEvent('review.invitation.duplicate', duplicateInvitation, {
						actorId: inviterId,
						metadata: {
							duplicateOf: String(existingInvite.id || existingInvite._id),
							source: 'email_reviewer_invitation'
						}
					});

					const duplicateDetails = await buildDuplicateInvitationDetails(existingInvite);
					return json(
						{
							success: false,
							error: 'Reviewer already invited for this paper',
							message: 'Reviewer already invited for this paper',
							duplicates: [duplicateDetails],
							skipped: [
								{
									reviewerId: normalizedReviewerId,
									reasons: ['Reviewer already invited for this paper'],
									existingInvitation: duplicateDetails
								}
							]
						},
						{ status: 409 }
					);
				}
			}
		}

		const smtpTransporter = getTransporter();
		if (!smtpTransporter) {
			const missingSmtpConfig = getMissingSmtpConfig();
			console.error(
				`SMTP credentials are not configured. Missing: ${missingSmtpConfig.join(', ')}`
			);
			return json(
				{
					error: 'Email service is not configured',
					details: `Missing environment variables: ${missingSmtpConfig.join(', ')}`
				},
				{ status: 500 }
			);
		}

		// Verify SMTP before saving the invitation so failed email attempts don't block retries.
		await smtpTransporter.verify();

		await EmailReviewerInvitation.updateMany(
			{
				email: normalizedEmail,
				hubId: hubIdValue,
				paperId: paperIdValue,
				status: 'pending'
			},
			{ status: 'expired', updatedAt: new Date() }
		);

		// Generate invitation token
		const token = crypto.randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		// Create invitation record
		const invitation = new EmailReviewerInvitation({
			email: normalizedEmail,
			hubId: hubIdValue,
			paperId: paperIdValue,
			invitedBy: inviterId,
			inviteType: paperIdValue ? 'paper_review' : 'hub_reviewer',
			customDeadlineDays: deadlineDays,
			token,
			expiresAt,
			status: 'pending'
		});

		await invitation.save();

		// Invitation URL
		const invitationUrl = `${getSiteUrl(url)}/invite/register?token=${token}`;
		const declineUrl = `${getSiteUrl(url)}/invite/decline?token=${token}`;

		// Send email
		try {
			await smtpTransporter.sendMail({
				from: `"SciLedger Team" <${process.env.SMTP_USER}>`,
				to: normalizedEmail,
				subject: '📝 Invitation to Join as Reviewer - SciLedger',
				html: buildReviewerInvitationEmailHtml({
					hubName: hub.title || hub.name || 'SciLedger hub',
					invitationUrl,
					declineUrl,
					paperTitle: paper?.title || null,
					paperAbstract: paper?.abstract || paper?.summary || null
				})
			});
		} catch (error) {
			await EmailReviewerInvitation.deleteOne({ _id: invitation._id }).catch((cleanupError) => {
				console.error('Failed to clean up unsent email invitation:', cleanupError);
			});
			throw error;
		}

		try {
			const inviteeUser = await Users.findOne({ email: normalizedEmail })
				.select('id _id firstName lastName email')
				.lean();
			const inviteeUserId = getUserId(inviteeUser);
			const eventRecipients: EventRecipient[] = [inviterId];
			const recipientRoles: Record<string, string> = {
				[inviterId]: paperIdValue ? 'editor' : 'inviter'
			};

			if (inviteeUserId && inviteeUserId !== inviterId) {
				eventRecipients.push({
					userId: inviteeUserId,
					channels: ['activity', 'notification']
				});
				recipientRoles[inviteeUserId] = paperIdValue ? 'reviewer' : 'invitee';
			}

			await emitEvent({
				type: paperIdValue ? 'review.invitation.created' : 'hub.invitation.created',
				actorId: inviterId,
				recipients: eventRecipients,
				entityType: paperIdValue ? 'reviewInvitation' : 'hub',
				entityId: paperIdValue ? String(invitation.id || invitation._id) : hubIdValue,
				metadata: {
					inviteId: String(invitation.id || invitation._id),
					emailInvitationId: String(invitation.id || invitation._id),
					paperId: paperIdValue,
					paperTitle: paper?.title || undefined,
					hubId: hubIdValue,
					hubName: hub.title || hub.name || 'SciLedger hub',
					reviewerId: inviteeUserId || undefined,
					reviewerName: getUserDisplayName(inviteeUser, normalizedEmail),
					reviewerEmail: normalizedEmail,
					inviteeId: inviteeUserId || undefined,
					inviteeName: getUserDisplayName(inviteeUser, normalizedEmail),
					inviteeEmail: normalizedEmail,
					inviterId,
					invitationUrl,
					declineUrl,
					expiresAt: expiresAt.toISOString(),
					source: 'email_reviewer_invitation',
					delivery: 'smtp',
					recipientRoles
				}
			});
		} catch (eventError) {
			console.error('Failed to emit email reviewer invitation event:', eventError);
		}

		return json({
			message: 'Invitation sent successfully',
			email: normalizedEmail
		});
	} catch (error) {
		console.error('❌ Error sending invitation:', error);
		return json(
			{
				error: getEmailSendErrorMessage(error),
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
