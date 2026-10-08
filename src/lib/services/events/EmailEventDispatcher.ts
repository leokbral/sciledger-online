import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import Users from '$lib/db/models/User';
import type {
	EventDispatcher,
	EventDispatcherContext,
	EventDispatchResult
} from '$lib/types/EventService';
import { getEventEmailTemplate } from './templates';
import { isOrcidPlaceholderEmail } from '$lib/helpers/orcidPlaceholderEmail';

type UserEmailLookup = {
	id?: string;
	_id?: string;
	email?: string;
};

/**
 * Enderecos nao entregaveis sao pulados antes de abrir uma conexao SMTP. Hoje
 * a unica familia conhecida e o placeholder do ORCID, cujo dominio nao existe:
 * a resolucao MX falha e o nodemailer lanca de forma sincrona.
 */
function isUndeliverableEmail(email: string): boolean {
	return isOrcidPlaceholderEmail(email);
}

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

			if (isUndeliverableEmail(user.email)) {
				results.push({
					channel: this.channel,
					status: 'skipped',
					recipientId: recipient.userId,
					reason: 'recipient_email_undeliverable'
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

			try {
				await transporter.sendMail({
					from: `"SciLedger Team" <${env.SMTP_USER}>`,
					to: user.email,
					subject: payload.subject,
					text: payload.text,
					html: payload.html
				});
			} catch (error) {
				// Um endereço que falha não pode silenciar os destinatários
				// seguintes: antes deste try/catch o throw abortava o loop e o
				// resto do evento ficava sem e-mail, sem nenhum registro.
				results.push({
					channel: this.channel,
					status: 'failed',
					recipientId: recipient.userId,
					error: error instanceof Error ? error.message : String(error)
				});
				continue;
			}

			results.push({
				channel: this.channel,
				status: 'sent',
				recipientId: recipient.userId
			});
		}

		return results;
	}
}
