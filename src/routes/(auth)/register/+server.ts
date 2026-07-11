import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { AUTH_CONFIG_SECRET } from '$env/static/private';
import { normalizeEmail } from '$lib/server/auth/normalizeEmail';
import { findValidEmailReviewerInvitation } from '$lib/server/auth/emailReviewerInvitation';
import {
	generateEmailVerificationToken,
	getEmailVerificationExpiresAt,
	getEmailVerificationUrl,
	hashEmailVerificationToken,
	sendEmailVerification
} from '$lib/server/auth/emailVerification';

export const POST: RequestHandler = async ({ request, url }) => {

	await start_mongo(); // Não necessário mais

	try {
		const {
			firstName,
			lastName,
			username,
			country,
			state,
			dob,
			email,
			password,
			confirmPassword,
			inviteToken
		} = await request.json();

		// Verifica se todas as informações necessárias foram enviadas
		if (!firstName || !lastName || !username || !country || !dob || !email || !password || !confirmPassword) {
			return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
		}

		// Verifica se as senhas coincidem
		if (password !== confirmPassword) {
			return json({ error: 'As senhas não coincidem.' }, { status: 400 });
		}

		const normalizedEmail = normalizeEmail(email);

		// Verifica se o usuário já existe
		const existingUser = await Users.findOne({ email: normalizedEmail });
		if (existingUser) {
			return json({ error: 'Usuário já cadastrado.' }, { status: 409 });
		}

		// Validação do handle: deve ser único, sem espaços e começar com "@"
        const usernamePattern = /^@[A-Za-z0-9_]{3,}$/;
        if (!usernamePattern.test(username)) {
            return json({ error: 'Username inválido. Não conter espaços.' }, { status: 400 });
        }

		// Verifica se o usuário já existe
		const existingUsername = await Users.findOne({ username });
		if (existingUsername) {
			return json({ error: 'Username já cadastrado.' }, { status: 409 });
		}



		// Cria um hash para a senha usando o crypto
		const salt = AUTH_CONFIG_SECRET //crypto.randomBytes(32).toString('hex');
		const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

		const id = crypto.randomUUID()

		// A invitation only counts when it is validated server-side against the
		// database (pending, unexpired, and issued for this exact email). The
		// Referer header is attacker-controlled and must never drive this decision.
		const invitation = await findValidEmailReviewerInvitation(inviteToken, normalizedEmail);
		const shouldSendEmailVerification = !invitation;
		const emailVerificationToken = shouldSendEmailVerification ? generateEmailVerificationToken() : '';
		const emailVerificationTokenHash = shouldSendEmailVerification
			? hashEmailVerificationToken(emailVerificationToken)
			: undefined;
		const emailVerificationExpiresAt = shouldSendEmailVerification
			? getEmailVerificationExpiresAt()
			: undefined;
		const emailVerificationLastSentAt = shouldSendEmailVerification ? new Date() : undefined;
		// Cria um novo usuário
		const newUser = new Users({
			_id: id,
			id: id,
			username,
			firstName,
			lastName,
			country,
			state,
			dob,
			email: normalizedEmail,
			handle: normalizedEmail,
			password: hashedPassword,
			emailVerified: false,
			...(shouldSendEmailVerification
				? {
						emailVerificationTokenHash,
						emailVerificationExpiresAt,
						emailVerificationLastSentAt,
						verificationSource: 'register'
					}
				: {}),
			isAdmin: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Salva o usuário no banco de dados
		await newUser.save();
		if (shouldSendEmailVerification) {
			await sendEmailVerification({
				to: newUser.email,
				firstName: newUser.firstName,
				verificationUrl: getEmailVerificationUrl(url.origin, emailVerificationToken)
			});
		}

		// Resposta de sucesso
		return json({ user: { id: newUser.id, email: newUser.email } }, { status: 201 });
	} catch (error) {
		console.error('Erro ao registrar usuário:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};
