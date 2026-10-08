import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import mongoose from 'mongoose';
import { UserSchema } from '$lib/db/schemas/UserSchema.js';
import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';
import { SITE_URL } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { buildPasswordResetEmailHtml } from '$lib/services/platformEmailTemplates';
import { normalizeAndValidateEmail } from '$lib/server/auth/normalizeEmail';
import { isOrcidPlaceholderEmail } from '$lib/helpers/orcidPlaceholderEmail';
import {
	generatePasswordResetToken,
	getPasswordResetExpiresAt,
	hashPasswordResetToken
} from '$lib/server/auth/passwordReset';

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		await start_mongo();

		const { email } = await request.json();

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const normalizedEmail = normalizeAndValidateEmail(email);
		if (!normalizedEmail) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Find user by email
		const user = await User.findOne({ email: normalizedEmail });

		if (!user) {
			// For security, always return success even if email doesn't exist
			return json({ message: 'success' });
		}

		// Contas ORCID sem e-mail publico ficam com um placeholder
		// `<orcid>@orcid.placeholder`, um dominio que nao existe. Nenhum e-mail
		// chega nelas, entao gerar um token aqui seria pior que inutil:
		//
		//  - o token e persistido ANTES do envio, logo uma falha deixaria um
		//    token valido no banco que ninguem consegue usar;
		//  - isso acionaria o bloco de rate-limit abaixo, bloqueando a conta em
		//    silencio por todo o tempo de vida do token;
		//  - e o erro do envio distinguiria esta conta de uma inexistente.
		//
		// Esse ultimo ponto e o mais serio: ORCID iDs sao publicos, entao
		// qualquer um pode montar o endereco placeholder de um iD e sondar se a
		// conta existe aqui. A resposta tem de ser indistinguivel da de uma
		// conta inexistente -- exatamente o mesmo `success` de cima.
		//
		// O caminho real para estas contas e cadastrar um endereco de verdade
		// em /settings/account, que avisa sobre isso de forma persistente.
		if (isOrcidPlaceholderEmail(user.email)) {
			return json({ message: 'success' });
		}

		// Check if there's already a valid token (not expired)
		if (user.resetPasswordTokenHash && user.resetPasswordExpiresAt) {
			const now = new Date();
			const expiry = new Date(user.resetPasswordExpiresAt);

			if (expiry > now) {
				return json({ message: 'success' });
			}
		}

		// Generate new recovery token; only the hash is persisted
		const resetToken = generatePasswordResetToken();
		const resetTokenExpiry = getPasswordResetExpiresAt();

		// Save token hash to user
		user.resetPasswordTokenHash = hashPasswordResetToken(resetToken);
		user.resetPasswordExpiresAt = resetTokenExpiry;
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

		// A mensagem de erro fica apenas nos logs do servidor (console.error
		// acima). Devolve-la ao cliente vazava detalhe interno e, pior, tornava
		// a resposta dependente da conta consultada -- um oraculo de enumeracao.
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
