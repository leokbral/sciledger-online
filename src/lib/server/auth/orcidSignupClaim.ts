import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as cookie from 'cookie';
import { env } from '$env/dynamic/private';
import { buildOrcidSignupConfirmationEmailHtml } from '$lib/services/platformEmailTemplates';

export const ORCID_SIGNUP_TOKEN_BYTES = 32;
export const ORCID_SIGNUP_CLAIM_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * How long the browser keeps the pointer to its half-finished sign-up. Shorter
 * than the claim's own TTL on purpose: the cookie only has to survive the walk
 * from the ORCID redirect to the e-mail form, while the confirmation link in
 * the e-mail stays valid for a day and works from any browser.
 */
export const ORCID_SIGNUP_COOKIE_NAME = 'orcid_signup';
export const ORCID_SIGNUP_COOKIE_TTL_MS = 60 * 60 * 1000;

export function generateOrcidSignupToken() {
	return crypto.randomBytes(ORCID_SIGNUP_TOKEN_BYTES).toString('hex');
}

export function hashOrcidSignupToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export function getOrcidSignupExpiresAt(now = new Date()) {
	return new Date(now.getTime() + ORCID_SIGNUP_CLAIM_TTL_MS);
}

export function isOrcidSignupExpired(expiresAt: Date | string, now = new Date()) {
	return new Date(expiresAt).getTime() <= now.getTime();
}

export function getOrcidSignupConfirmationUrl(siteUrl: string, token: string) {
	const baseUrl = siteUrl.replace(/\/+$/, '');
	return `${baseUrl}/orcid/confirm?token=${encodeURIComponent(token)}`;
}

export function serializeOrcidSignupCookie(
	claimId: string,
	options: { secure?: boolean; expires?: Date } = {}
) {
	return cookie.serialize(ORCID_SIGNUP_COOKIE_NAME, claimId, {
		path: '/',
		httpOnly: true,
		secure: Boolean(options.secure),
		sameSite: 'lax',
		expires: options.expires ?? new Date(Date.now() + ORCID_SIGNUP_COOKIE_TTL_MS)
	});
}

export function serializeExpiredOrcidSignupCookie(options: { secure?: boolean } = {}) {
	return serializeOrcidSignupCookie('deleted', {
		secure: options.secure,
		expires: new Date(0)
	});
}

export type PreparedOrcidSignupEmail = {
	pendingEmail: string;
	tokenHash: string;
	expiresAt: Date;
	token: string;
};

/**
 * Pure computation of the fields a claim should carry once the person has
 * supplied an address. Mirrors `prepareEmailChange` so the two confirmation
 * flows cannot drift apart: only the hash is ever persisted, and the raw token
 * is handed back for the e-mail and nowhere else.
 */
export function prepareOrcidSignupEmail(
	normalizedEmail: string,
	now = new Date()
): PreparedOrcidSignupEmail {
	const token = generateOrcidSignupToken();

	return {
		pendingEmail: normalizedEmail,
		tokenHash: hashOrcidSignupToken(token),
		expiresAt: getOrcidSignupExpiresAt(now),
		token
	};
}

let transporter: nodemailer.Transporter | null = null;

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

export type SendOrcidSignupConfirmationInput = {
	to: string;
	firstName: string;
	confirmationUrl: string;
};

export async function sendOrcidSignupConfirmation(input: SendOrcidSignupConfirmationInput) {
	const smtpTransporter = getTransporter();
	if (!smtpTransporter) {
		throw new Error('Email service is not configured');
	}

	await smtpTransporter.verify();
	await smtpTransporter.sendMail({
		from: `"SciLedger Team" <${env.SMTP_USER}>`,
		to: input.to,
		subject: 'Confirm your email to finish signing in with ORCID - SciLedger',
		html: buildOrcidSignupConfirmationEmailHtml(input.firstName, input.confirmationUrl)
	});
}
