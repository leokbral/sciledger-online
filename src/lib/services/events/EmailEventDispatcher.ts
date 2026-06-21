import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import Users from '$lib/db/models/User';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';
import { getEventEmailTemplate } from './templates';

type UserEmailLookup = {
	id?: string;
	_id?: string;
	email?: string;
};

export class EmailEventDispatcher implements EventDispatcher {
	readonly channel = 'email' as const;
	private transporter: nodemailer.Transporter | null = null;

	private getTransporter() {
		if (this.transporter) {
			return this.transporter;
		}

		if (!env.SMTP_USER || !env.SMTP_PASS) {
			return null;
		}

		const smtpPort = Number(env.SMTP_PORT || 587);
		this.transporter = nodemailer.createTransport({
			host: env.SMTP_HOST || 'smtp.gmail.com',
			port: smtpPort,
			secure: env.SMTP_SECURE === 'true' || smtpPort === 465,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS
			}
		});

		return this.transporter;
	}

	async dispatch({ event }: EventDispatcherContext): Promise<EventDispatchResult[]> {
		const template = getEventEmailTemplate(event.type);
		if (!template) {
			return [
				{
					channel: this.channel,
					status: 'skipped',
					reason: 'no_email_template'
				}
			];
		}

		const transporter = this.getTransporter();
		if (!transporter) {
			return [
				{
					channel: this.channel,
					status: 'skipped',
					reason: 'smtp_not_configured'
				}
			];
		}

		const results: EventDispatchResult[] = [];

		for (const recipient of event.recipients) {
			if (!recipient.channels.includes(this.channel)) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'recipient_channel_disabled'
				});
				continue;
			}

			const user = (await Users.findOne({
				$or: [{ id: recipient.userId }, { _id: recipient.userId }]
			})
				.select('id email')
				.lean()) as UserEmailLookup | null;

			if (!user?.email) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'recipient_email_not_found'
				});
				continue;
			}

			const payload = await template({ event, recipient });
			if (!payload) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'template_returned_empty'
				});
				continue;
			}

			await transporter.sendMail({
				from: `"SciLedger Team" <${env.SMTP_USER}>`,
				to: user.email,
				subject: payload.subject,
				text: payload.text,
				html: payload.html
			});

			results.push({
				channel: this.channel,
				status: 'sent',
				recipientId: recipient.userId
			});
		}

		return results;
	}
}
