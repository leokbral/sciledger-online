import nodemailer from 'nodemailer';
import Users from '$lib/db/models/User';
import { env } from '$env/dynamic/private';
import { createEmailLayout, type EmailDetail } from '$lib/services/emailDesignSystem';

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
	details?: EmailDetail[];
	actionLabel: string;
	actionUrl: string;
	note?: string;
}): string {
	return createEmailLayout({
		title: data.title,
		subtitle: 'Paper workflow update',
		greeting: data.greeting,
		message: data.intro,
		details: data.details,
		actionLabel: data.actionLabel,
		actionUrl: data.actionUrl,
		fallbackUrl: data.actionUrl,
		warning: data.note ? { title: 'Note', message: data.note } : undefined
	});
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
		const details: EmailDetail[] = [
			{ label: 'Paper title', value: data.paperTitle },
			{ label: 'Status', value: 'Submitted' }
		];

		return {
			subject: `Submission Confirmation: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nThis is to confirm that the paper "${data.paperTitle}" has been successfully submitted${submittedByLine}.\n\nYou can track its progress at the link below:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'Submission Confirmation',
				greeting: `Dear ${data.recipientName},`,
				intro: `This is to confirm that the paper <strong>${data.paperTitle}</strong> has been successfully submitted${submittedByLine}.`,
				details,
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
		const acceptedLabel =
			data.acceptanceType === 'publication' ? 'approved for publication' : 'accepted for review';
		const details: EmailDetail[] = [
			{ label: 'Paper title', value: data.paperTitle },
			{ label: 'New status', value: acceptedLabel }
		];

		return {
			subject: `Paper Status Update: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nYour paper "${data.paperTitle}" has been ${acceptedLabel}${acceptedByLine}.\n\nYou can view the latest details at:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'Paper Status Update',
				greeting: `Dear ${data.recipientName},`,
				intro: `Your paper <strong>${data.paperTitle}</strong> has been <strong>${acceptedLabel}</strong>${acceptedByLine}.`,
				details,
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
		const details: EmailDetail[] = [
			{ label: 'Hub', value: data.hubName },
			{ label: 'Paper title', value: data.paperTitle },
			{ label: 'Submitted by', value: submittedByLabel }
		];

		return {
			subject: `New Hub Submission: ${data.paperTitle}`,
			text: `Dear ${data.recipientName},\n\nA new paper has been submitted to your hub "${data.hubName}".\n\nPaper title: "${data.paperTitle}"\nSubmitted by: ${submittedByLabel}\n\nYou can review the submission at:\n${paperUrl}\n\nRegards,\nSciLedger Team\n\nThis is an automated message. Please do not reply.`,
			html: renderNotificationTemplate({
				title: 'New Hub Submission',
				greeting: `Dear ${data.recipientName},`,
				intro: `A new paper has been submitted to your hub <strong>${data.hubName}</strong>.`,
				details,
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
			console.warn(
				'PaperLifecycleEmailService: SMTP is not configured. Skipping submission email.'
			);
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
			console.warn(
				'PaperLifecycleEmailService: SMTP is not configured. Skipping acceptance email.'
			);
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
			console.warn(
				'PaperLifecycleEmailService: SMTP is not configured. Skipping hub admin submission email.'
			);
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
