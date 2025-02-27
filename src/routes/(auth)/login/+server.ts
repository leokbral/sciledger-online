import type { RequestHandler } from './$types';
import crypto from 'crypto';
import { respond } from '../_respond';
import { AUTH_CONFIG_SECRET } from '$env/static/private';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

export const POST: RequestHandler = async ({ request }) => {
	try {
		await start_mongo(); // Não necessário mais
		const { login, password } = await request.json();

		// Verifica se os dados foram enviados
		if (!login || !password) {
			return respond({ errors: 'Email/Username and password are required.', status: 400 });
		}

		// Adiciona o '@' se não estiver presente no login (no caso de ser um username)
		let queryLogin = login;
		if (!login.includes('@')) {
		  queryLogin = `@${login}`; // Adiciona o '@' para procurar o username corretamente
		}

		// Encontra o usuário no banco de dados
		const user = await Users.findOne({ $or: [{ email: queryLogin }, { username: queryLogin }] });
		
		if (!user) {
			return respond({ errors: 'Invalid credentials.', status: 401 });
		}

		// Verifica a senha
		const salt = AUTH_CONFIG_SECRET;
		const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
		if (hashedPassword !== user.password) {
			return respond({ errors: 'Invalid credentials.', status: 401 });
		}

		// Usuário autenticado com sucesso
		return respond({
			user
		});
	} catch (err) {
		console.error('Login error:', err);
		return respond({ errors: 'Internal server error.', status: 500 });
	}
};
