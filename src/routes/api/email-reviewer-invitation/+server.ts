import 'dotenv/config';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { EmailReviewerInvitationSchema } from '$lib/db/schemas/EmailReviewerInvitation.js';
import { HubSchema } from '$lib/db/schemas/HubSchema.js';
import Papers from '$lib/db/models/Paper';
import * as crypto from 'crypto';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { canManageHub } from '$lib/helpers/hubPermissions';

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

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = value.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (email.length > 254 || !emailRegex.test(email)) {
		return null;
	}

	return email;
}

function generateInvitationEmailTemplate(
	email: string,
	hubName: string,
	invitationUrl: string,
	declineUrl: string,
	options?: {
		paperTitle?: string | null;
		paperAbstract?: string | null;
	}
): string {
	const paperTitle = options?.paperTitle?.trim() || '';
	const paperAbstract = options?.paperAbstract?.trim() || '';
	// Normalize and remove HTML tags, but preserve line breaks from common tags
	const stripHtml = (s: string) =>
		String(s || '')
			.replace(/<\s*(br|\/p|p)[^>]*>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/\r\n|\r/g, '\n')
			.replace(/\n\s+/g, '\n')
			.trim();

	const cleanPaperTitle = stripHtml(paperTitle);
	const cleanPaperAbstract = stripHtml(paperAbstract);
	const hasPaperContext = Boolean(cleanPaperTitle || cleanPaperAbstract);

	const safeText = (value: string) =>
		value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

	// Use full abstract in email, render line breaks using CSS `white-space: pre-wrap`
	const paperSection = hasPaperContext
		? `
					<div style="background-color: #ffffff; border: 1px solid #e6eefc; padding: 22px; margin: 22px 0; border-radius: 8px;">
						<h3 style="margin: 0 0 10px 0; font-size: 18px; color: #0b3d91;">📄 ${safeText(cleanPaperTitle || 'Untitled')}</h3>
						${cleanPaperAbstract ? `<div style="margin-top:8px; color: #374151; font-size: 14px; line-height:1.5; white-space: pre-wrap;">${safeText(cleanPaperAbstract)}</div>` : ''}
					</div>
				`
		: '';

	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reviewer Invitation - SciLedger</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
				<!-- Header -->
				<div style="background-color: #07326a; color: #ffffff; padding: 28px 20px; text-align: center;">
					<h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">SciLedger</h1>
					<p style="margin: 8px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.95); opacity: 0.95;">Scientific Platform</p>
				</div>

                <!-- Content -->
                <div style="padding: 40px 30px;">
				<h2 style="color: #0f1724; margin-bottom: 14px; font-size: 20px; font-weight: 600;">You've Been Invited to Join as a Reviewer</h2>

				<p style="font-size: 15px; margin-bottom: 14px; color: #334155;">Hello,</p>

				<p style="font-size: 15px; margin-bottom: 20px; color: #334155;">You have been invited to join <strong>SciLedger</strong> as a reviewer for the following hub:</p>

                    <!-- Hub Info Box -->
					<div style="background-color: #f4f8ff; border-left: 4px solid #0b63d6; padding: 16px; margin: 20px 0; border-radius: 6px;">
						<p style="margin: 0; color: #0b3d91; font-weight: 600; font-size: 15px;"><strong>Hub:</strong> ${hubName}</p>
					</div>

					${paperSection}

					<p style="font-size: 16px; margin-bottom: 25px;">To accept this invitation and create your reviewer account, please click the button below:</p>

                    <!-- Button -->
					<div style="text-align: center; margin: 36px 0;">
						<a href="${invitationUrl}" style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
							Accept Invitation & Register
						</a>
					</div>

					<p style="font-size: 14px; color: #666; margin-bottom: 12px;">If you are unable to review, you can decline and inform the hub manager:</p>
					<div style="text-align: center; margin: 0 0 30px 0;">
						<a href="${declineUrl}" style="display: inline-block; background-color: #f3f4f6; color: #111827; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db;">
							Decline Invitation
						</a>
					</div>

                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
                    <div style="word-break: break-all; background-color: #f8f4ff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e0e0e0;">
                        ${invitationUrl}
                    </div>

                    <!-- Warning Box -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                        <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Important</p>
                        <p style="color: #856404; margin: 5px 0 0 0;">This invitation link will expire in <strong>7 days</strong>.</p>
                    </div>

                    <p style="font-size: 16px; margin-top: 30px;">We look forward to having you as part of our reviewer community!</p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">© ${new Date().getFullYear()} SciLedger. All rights reserved.</p>
                    <p style="font-size: 12px; color: #666; margin: 0;">This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
    `;
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

		if (!canManageHub(hub, inviterId)) {
			return json(
				{ error: 'Only hub managers can send reviewer email invitations' },
				{ status: 403 }
			);
		}

		let paper: any = null;
		let paperIdValue: string | null = null;
		let deadlineDays: number | null = null;

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
			const paperHubId = typeof paper.hubId === 'object' ? paper.hubId?._id || paper.hubId?.id : paper.hubId;
			if (paperHubId && String(paperHubId) !== hubIdValue) {
				return json({ error: 'Paper does not belong to this hub' }, { status: 400 });
			}
		}

		const smtpTransporter = getTransporter();
		if (!smtpTransporter) {
			const missingSmtpConfig = getMissingSmtpConfig();
			console.error(`SMTP credentials are not configured. Missing: ${missingSmtpConfig.join(', ')}`);
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
				html: generateInvitationEmailTemplate(
					normalizedEmail,
					hub.title || hub.name || 'SciLedger hub',
					invitationUrl,
						declineUrl,
					{
						paperTitle: paper?.title || null,
						paperAbstract: paper?.abstract || paper?.summary || null
					}
				)
			});
		} catch (error) {
			await EmailReviewerInvitation.deleteOne({ _id: invitation._id }).catch((cleanupError) => {
				console.error('Failed to clean up unsent email invitation:', cleanupError);
			});
			throw error;
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
