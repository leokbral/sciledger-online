import nodemailer from 'nodemailer';
import Users from '$lib/db/models/User';
import { env } from '$env/dynamic/private';

type UserRecipient = {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
};

type UserLookup = {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
};

type EmailPayload = {
	subject: string;
	text: string;
	html: string;
};

function buildPaperUrl(paperId: string): string {
	const siteUrl = env.SITE_URL || env.PUBLIC_SITE_URL || '';
	if (!siteUrl) {
		return `/publish/view/${paperId}`;
	}

	return `${siteUrl.replace(/\/$/, '')}/publish/view/${paperId}`;
}

function getDisplayName(user: UserRecipient): string {
	const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
	return fullName || user.email;
}

function renderNotificationTemplate(data: {
	title: string;
	greeting: string;
	intro: string;
	detailsHtml?: string;
	actionLabel: string;
	actionUrl: string;
	note?: string;
}): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title>${data.title} - SciLedger</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa;">
			<div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
				<div style="background-color: #0170f3; color: white; padding: 30px 20px; text-align: center;">
					<h1 style="margin: 0; font-size: 32px; font-weight: bold;">SciLedger</h1>
					<p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Scientific Platform</p>
				</div>

				<div style="padding: 40px 30px;">
					<h2 style="color: #333; margin-bottom: 20px; font-size: 24px;">${data.title}</h2>
					<p style="font-size: 16px; margin-bottom: 20px;">${data.greeting}</p>
					<p style="font-size: 16px; margin-bottom: 25px;">${data.intro}</p>

					${data.detailsHtml || ''}

					<div style="text-align: center; margin: 40px 0;">
						<a href="${data.actionUrl}" style="display: inline-block; background-color: #0170f3; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(1, 112, 243, 0.3);">
							${data.actionLabel}
						</a>
					</div>

					<p style="font-size: 14px; color: #666; margin-bottom: 10px;">If the button does not work, copy and paste this link into your browser:</p>
					<div style="word-break: break-all; background-color: #f8f4ff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e0e0e0;">
						${data.actionUrl}
					</div>

					${data.note ? `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;"><p style="color: #856404; margin: 0; font-weight: bold;">Note</p><p style="color: #856404; margin: 5px 0 0 0;">${data.note}</p></div>` : ''}
				</div>

				<div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
					<p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">© ${new Date().getFullYear()} SciLedger. All rights reserved.</p>
					<p style="font-size: 12px; color: #666; margin: 0;">This is an automated message. Please do not reply.</p>
				</div>
			</div>
		</body>
		</html>
	`;
}

export class PaperLifecycleEmailService {
	private static transporter: nodemailer.Transporter | null = null;

	private static getTransporter(): nodemailer.Transporter | null {
		if (this.transporter) {
			return this.transporter;
		}

		const smtpUser = env.SMTP_USER;
		const smtpPass = env.SMTP_PASS;

		if (!smtpUser || !smtpPass) {
			return null;
		}

		this.transporter = nodemailer.createTransport({
			host: env.SMTP_HOST || 'smtp.gmail.com',
			port: Number(env.SMTP_PORT || 587),
			secure: false,
			auth: {
				user: smtpUser,
				pass: smtpPass
			}
		});

		return this.transporter;
	}

	private static async resolveRecipients(authorIds: string[]): Promise<UserRecipient[]> {
		const uniqueIds = [...new Set(authorIds.filter(Boolean).map((id) => String(id)))];

		if (uniqueIds.length === 0) {
			return [];
		}

		const users = (await Users.find({ id: { $in: uniqueIds } })
			.select('id firstName lastName email')
			.lean()) as UserLookup[];

		return users
			.filter((user) => user?.email)
			.map((user) => ({
				id: String(user.id),
				email: String(user.email),
				firstName: user.firstName ? String(user.firstName) : undefined,
				lastName: user.lastName ? String(user.lastName) : undefined
			}));
	}

	static buildSubmissionEmailPayload(data: {
		recipientName: string;
		paperId: string;
		paperTitle: string;
		submittedByName?: string;
	}): EmailPayload {
		const paperUrl = buildPaperUrl(data.paperId);
		const submittedByLine = data.submittedByName ? ` by ${data.submittedByName}` : '';
		const detailsHtml = `
			<div style="background-color: #f8f9fa; border-left: 4px solid #0170f3; padding: 20px; margin: 25px 0; border-radius: 4px;">
				<p style="margin: 0 0 8px 0;"><strong>Paper title:</strong> ${data.paperTitle}</p>
				<p style="margin: 0;"><strong>Status:</strong> Submitted</p>
			</div>
		`;

		return {
			subject: `Submission Confirmation: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nThis is to confirm that the paper "${data.paperTitle}" has been successfully submitted${submittedByLine}.\n\nYou can track its progress at the link below:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'Submission Confirmation',
				greeting: `Dear ${data.recipientName},`,
				intro: `This is to confirm that the paper <strong>${data.paperTitle}</strong> has been successfully submitted${submittedByLine}.`,
				detailsHtml,
				actionLabel: 'View Submission',
				actionUrl: paperUrl,
				note: 'You will continue to receive status updates as the submission progresses.'
			})
		};
	}

	static buildAcceptedEmailPayload(data: {
		recipientName: string;
		paperId: string;
		paperTitle: string;
		acceptedByName?: string;
		acceptanceType: 'review' | 'publication';
	}): EmailPayload {
		const paperUrl = buildPaperUrl(data.paperId);
		const acceptedByLine = data.acceptedByName ? ` by ${data.acceptedByName}` : '';
		const acceptedLabel = data.acceptanceType === 'publication' ? 'approved for publication' : 'accepted for review';
		const detailsHtml = `
			<div style="background-color: #f8f9fa; border-left: 4px solid #0170f3; padding: 20px; margin: 25px 0; border-radius: 4px;">
				<p style="margin: 0 0 8px 0;"><strong>Paper title:</strong> ${data.paperTitle}</p>
				<p style="margin: 0;"><strong>New status:</strong> ${acceptedLabel}</p>
			</div>
		`;

		return {
			subject: `Paper Status Update: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nYour paper "${data.paperTitle}" has been ${acceptedLabel}${acceptedByLine}.\n\nYou can view the latest details at:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'Paper Status Update',
				greeting: `Dear ${data.recipientName},`,
				intro: `Your paper <strong>${data.paperTitle}</strong> has been <strong>${acceptedLabel}</strong>${acceptedByLine}.`,
				detailsHtml,
				actionLabel: 'View Paper Details',
				actionUrl: paperUrl,
				note: 'Please review the updated status and next actions in your dashboard.'
			})
		};
	}

	static buildHubAdminSubmissionEmailPayload(data: {
		recipientName: string;
		hubName: string;
		paperId: string;
		paperTitle: string;
		submittedByName?: string;
	}): EmailPayload {
		const paperUrl = buildPaperUrl(data.paperId);
		const submittedByLabel = data.submittedByName || 'an author';
		const detailsHtml = `
			<div style="background-color: #f8f9fa; border-left: 4px solid #0170f3; padding: 20px; margin: 25px 0; border-radius: 4px;">
				<p style="margin: 0 0 8px 0;"><strong>Hub:</strong> ${data.hubName}</p>
				<p style="margin: 0 0 8px 0;"><strong>Paper title:</strong> ${data.paperTitle}</p>
				<p style="margin: 0;"><strong>Submitted by:</strong> ${submittedByLabel}</p>
			</div>
		`;

		return {
			subject: `New Hub Submission: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nA new paper has been submitted to your hub "${data.hubName}".\n\nPaper title: "${data.paperTitle}"\nSubmitted by: ${submittedByLabel}\n\nYou can review the submission at:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'New Hub Submission',
				greeting: `Dear ${data.recipientName},`,
				intro: `A new paper has been submitted to your hub <strong>${data.hubName}</strong>.`,
				detailsHtml,
				actionLabel: 'Review Submission',
				actionUrl: paperUrl,
				note: 'Please review the submission details and proceed with the appropriate editorial decision.'
			})
		};
	}

	static async sendSubmissionConfirmation(data: {
		paperId: string;
		paperTitle: string;
		authorIds: string[];
		submittedByName?: string;
	}) {
		const transporter = this.getTransporter();
		if (!transporter) {
			console.warn('PaperLifecycleEmailService: SMTP is not configured. Skipping submission email.');
			return;
		}

		const recipients = await this.resolveRecipients(data.authorIds);
		if (recipients.length === 0) {
			return;
		}

		const sender = env.SMTP_USER || 'no-reply@sciledger.online';

		for (const recipient of recipients) {
			const recipientName = getDisplayName(recipient);
			const payload = this.buildSubmissionEmailPayload({
				recipientName,
				paperId: data.paperId,
				paperTitle: data.paperTitle,
				submittedByName: data.submittedByName
			});

			await transporter.sendMail({
				from: `"SciLedger Team" <${sender}>`,
				to: recipient.email,
				subject: payload.subject,
				text: payload.text,
				html: payload.html
			});
		}
	}

	static async sendPaperAcceptedEmail(data: {
		paperId: string;
		paperTitle: string;
		authorIds: string[];
		acceptedByName?: string;
		acceptanceType: 'review' | 'publication';
	}) {
		const transporter = this.getTransporter();
		if (!transporter) {
			console.warn('PaperLifecycleEmailService: SMTP is not configured. Skipping acceptance email.');
			return;
		}

		const recipients = await this.resolveRecipients(data.authorIds);
		if (recipients.length === 0) {
			return;
		}

		const sender = env.SMTP_USER || 'no-reply@sciledger.online';

		for (const recipient of recipients) {
			const recipientName = getDisplayName(recipient);
			const payload = this.buildAcceptedEmailPayload({
				recipientName,
				paperId: data.paperId,
				paperTitle: data.paperTitle,
				acceptedByName: data.acceptedByName,
				acceptanceType: data.acceptanceType
			});

			await transporter.sendMail({
				from: `"SciLedger Team" <${sender}>`,
				to: recipient.email,
				subject: payload.subject,
				text: payload.text,
				html: payload.html
			});
		}
	}

	static async sendHubAdminSubmissionEmail(data: {
		hubAdminId: string;
		hubName: string;
		paperId: string;
		paperTitle: string;
		submittedByName?: string;
	}) {
		const transporter = this.getTransporter();
		if (!transporter) {
			console.warn('PaperLifecycleEmailService: SMTP is not configured. Skipping hub admin submission email.');
			return;
		}

		const recipients = await this.resolveRecipients([data.hubAdminId]);
		if (recipients.length === 0) {
			return;
		}

		const recipient = recipients[0];
		const recipientName = getDisplayName(recipient);
		const payload = this.buildHubAdminSubmissionEmailPayload({
			recipientName,
			hubName: data.hubName,
			paperId: data.paperId,
			paperTitle: data.paperTitle,
			submittedByName: data.submittedByName
		});

		const sender = env.SMTP_USER || 'no-reply@sciledger.online';
		await transporter.sendMail({
			from: `"SciLedger Team" <${sender}>`,
			to: recipient.email,
			subject: payload.subject,
			text: payload.text,
			html: payload.html
		});
	}
}