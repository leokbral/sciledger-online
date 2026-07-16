import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';
import { buildEmailVerificationEmailHtml } from '$lib/services/platformEmailTemplates';

export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;

let transporter: nodemailer.Transporter | null = null;

export function generateEmailVerificationToken() {
	return crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
}

export function hashEmailVerificationToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export function getEmailVerificationExpiresAt(now = new Date()) {
	return new Date(now.getTime() + EMAIL_VERIFICATION_TTL_MS);
}

export function isEmailVerificationExpired(expiresAt: Date | string, now = new Date()) {
	return new Date(expiresAt).getTime() <= now.getTime();
}

export function getEmailVerificationCooldownSeconds(lastSentAt: Date | string, now = new Date()) {
	const elapsedMs = now.getTime() - new Date(lastSentAt).getTime();
	const remainingMs = EMAIL_VERIFICATION_RESEND_COOLDOWN_MS - elapsedMs;
	return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function isEmailVerificationCooldownActive(lastSentAt?: Date | string | null, now = new Date()) {
	if (!lastSentAt) return false;
	return getEmailVerificationCooldownSeconds(lastSentAt, now) > 0;
}

export function getEmailVerificationUrl(siteUrl: string, token: string) {
	const baseUrl = siteUrl.replace(/\/+$/, '');
	return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
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

export type SendEmailVerificationInput = {
	to: string;
	firstName: string;
	verificationUrl: string;
};

export async function sendEmailVerification(input: SendEmailVerificationInput) {
	const smtpTransporter = getTransporter();
	if (!smtpTransporter) {
		throw new Error('Email service is not configured');
	}

	await smtpTransporter.verify();
	await smtpTransporter.sendMail({
		from: `"SciLedger Team" <${env.SMTP_USER}>`,
		to: input.to,
		subject: 'Verify your email - SciLedger',
		html: buildEmailVerificationEmailHtml(input.firstName, input.verificationUrl)
	});
}
