import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import * as crypto from 'crypto';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { SITE_URL } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { buildPasswordResetEmailHtml } from '$lib/services/platformEmailTemplates';

const User = mongoose.models.User || mongoose.model('User', UserSchema);

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

function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const email = value.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (email.length > 254 || !emailRegex.test(email)) {
		return null;
	}

	return email;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		await start_mongo();

		const { email } = await request.json();

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const normalizedEmail = normalizeEmail(email);
		if (!normalizedEmail) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Find user by email
		const user = await User.findOne({ email: normalizedEmail });

		if (!user) {
			// For security, always return success even if email doesn't exist
			return json({ message: 'success' });
		}

		// Check if there's already a valid token (not expired)
		if (user.resetPasswordToken && user.resetPasswordExpiry) {
			const now = new Date();
			const expiry = new Date(user.resetPasswordExpiry);

			if (expiry > now) {
				return json({ message: 'success' });
			}
		}

		// Generate new recovery token
		const resetToken = crypto.randomBytes(32).toString('hex');
		const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

		// Save token to user
		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiry = resetTokenExpiry.toISOString();
		user.updatedAt = new Date().toISOString();
		await user.save();

		// Reset URL
		const resetUrl = `${SITE_URL}/reset?token=${resetToken}`;

		// Verify transporter connection (same as test-email.js)
		const smtpTransporter = getTransporter();
		if (!smtpTransporter) {
			console.error('SMTP credentials are not configured.');
			return json({ error: 'Email service is not configured' }, { status: 500 });
		}

		await smtpTransporter.verify();
		const info = await smtpTransporter.sendMail({
			from: `"SciLedger Team" <${env.SMTP_USER}>`,
			to: user.email,
			subject: '🔐 Reset Password - SciLedger',
			html: buildPasswordResetEmailHtml(user.firstName, resetUrl)
		});

		return json({ message: 'success' });
	} catch (error) {
		console.error('❌ Error in password recovery:', error);

		// Detailed error logging
		if (error instanceof Error) {
			console.error('Error name:', error.name);
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}

		return json(
			{
				error: 'Internal server error',
				details: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
