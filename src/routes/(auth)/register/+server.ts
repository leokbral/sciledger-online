import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import * as crypto from 'crypto';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';
import { AUTH_CONFIG_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {

	await start_mongo(); // Não necessário mais

	try {
		const { firstName, lastName, username, country, dob, email, password, confirmPassword } =
			await request.json();

		// Verifica se todas as informações necessárias foram enviadas
		if (!firstName || !lastName || !username || !country || !dob || !email || !password || !confirmPassword) {
			/* console.log(firstName, lastName, country, dob, email, password, confirmPassword) */
			return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
		}

		// Verifica se as senhas coincidem
		if (password !== confirmPassword) {
			return json({ error: 'As senhas não coincidem.' }, { status: 400 });
		}

		// Verifica se o usuário já existe
		const existingUser = await Users.findOne({ email });
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
		// Cria um novo usuário
		const newUser = new Users({
			_id: id,
			id: id,
			username,
			firstName,
			lastName,
			country,
			dob,
			email,
			handle: email,
			password: hashedPassword,
			isAdmin: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Salva o usuário no banco de dados
		await newUser.save();

		// Resposta de sucesso
		return json({ user: { id: newUser.id, email: newUser.email } }, { status: 201 });
	} catch (error) {
		console.error('Erro ao registrar usuário:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};
