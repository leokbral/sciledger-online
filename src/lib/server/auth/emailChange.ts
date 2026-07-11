import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import {
	buildEmailChangeConfirmationEmailHtml,
	buildEmailChangedNotificationEmailHtml
} from '$lib/services/platformEmailTemplates';

export const EMAIL_CHANGE_TOKEN_BYTES = 32;
export const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_CHANGE_RESEND_COOLDOWN_MS = 60 * 1000;

let transporter: nodemailer.Transporter | null = null;

export function generateEmailChangeToken() {
	return crypto.randomBytes(EMAIL_CHANGE_TOKEN_BYTES).toString('hex');
}

export function hashEmailChangeToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export function getEmailChangeExpiresAt(now = new Date()) {
	return new Date(now.getTime() + EMAIL_CHANGE_TTL_MS);
}

export function isEmailChangeExpired(expiresAt: Date | string, now = new Date()) {
	return new Date(expiresAt).getTime() <= now.getTime();
}

export function getEmailChangeCooldownSeconds(lastSentAt: Date | string, now = new Date()) {
	const elapsedMs = now.getTime() - new Date(lastSentAt).getTime();
	const remainingMs = EMAIL_CHANGE_RESEND_COOLDOWN_MS - elapsedMs;
	return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isEmailChangeCooldownActive(lastSentAt?: Date | string | null, now = new Date()) {
	if (!lastSentAt) return false;
	return getEmailChangeCooldownSeconds(lastSentAt, now) > 0;
}

export function getEmailChangeConfirmationUrl(siteUrl: string, token: string) {
	const baseUrl = siteUrl.replace(/\/+$/, '');
	return `${baseUrl}/confirm-email-change?token=${encodeURIComponent(token)}`;
}

export type PreparedEmailChange = {
	pendingEmail: string;
	pendingEmailTokenHash: string;
	pendingEmailExpiresAt: Date;
	pendingEmailLastSentAt: Date;
	token: string;
};

/**
 * Pure (DB-agnostic) computation of the fields an email-change request or
 * resend should write to the user document. Callers assign these onto their
 * own document and persist it -- shared here so /api/account/email-change,
 * its resend endpoint, and /complete-profile can never diverge on how a
 * pending email change is represented.
 */
export function prepareEmailChange(normalizedNewEmail: string, now = new Date()): PreparedEmailChange {
	const token = generateEmailChangeToken();

	return {
		pendingEmail: normalizedNewEmail,
		pendingEmailTokenHash: hashEmailChangeToken(token),
		pendingEmailExpiresAt: getEmailChangeExpiresAt(now),
		pendingEmailLastSentAt: now,
		token
	};
}

function getTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter;

	const smtpUser = env.SMTP_USER;
	const smtpPass = env.SMTP_PASS;

	if (!smtpUser || !smtpPass) {
		return null;
	}

	const smtpPort = Number(env.SMTP_PORT || 587);
	transporter = nodemailer.createTransport({
		host: env.SMTP_HOST || 'smtp.gmail.com',
		port: smtpPort,
		secure: env.SMTP_SECURE === 'true' || smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass
		},
		debug: env.SMTP_DEBUG === 'true',
		logger: env.SMTP_DEBUG === 'true'
	});

	return transporter;
}

export type SendEmailChangeConfirmationInput = {
	to: string;
	firstName: string;
	confirmationUrl: string;
};

export async function sendEmailChangeConfirmation(input: SendEmailChangeConfirmationInput) {
	const smtpTransporter = getTransporter();
	if (!smtpTransporter) {
		throw new Error('Email service is not configured');
	}

	await smtpTransporter.verify();
	await smtpTransporter.sendMail({
		from: `"SciLedger Team" <${env.SMTP_USER}>`,
		to: input.to,
		subject: 'Confirm your new email - SciLedger',
		html: buildEmailChangeConfirmationEmailHtml(input.firstName, input.confirmationUrl)
	});
}

export type SendEmailChangedNotificationInput = {
	to: string;
	firstName: string;
	newEmail: string;
};

/** Audit notice sent to the OLD address after a confirmed email change. */
export async function sendEmailChangedNotification(input: SendEmailChangedNotificationInput) {
	const smtpTransporter = getTransporter();
	if (!smtpTransporter) {
		throw new Error('Email service is not configured');
	}

	await smtpTransporter.verify();
	await smtpTransporter.sendMail({
		from: `"SciLedger Team" <${env.SMTP_USER}>`,
		to: input.to,
		subject: 'Your SciLedger account email has changed',
		html: buildEmailChangedNotificationEmailHtml(input.firstName, input.newEmail)
	});
}
