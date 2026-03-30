import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

interface CompleteProfileRequest {
	firstName: string;
	lastName: string;
	email: string;
	country?: string;
	dob?: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		await start_mongo();

		const data: CompleteProfileRequest = await request.json();

		// Valida dados obrigatórios
		if (!data.firstName || !data.lastName || !data.email) {
			return json(
				{
					success: false,
					message: 'Primeiro nome, sobrenome e email são obrigatórios'
				},
				{ status: 400 }
			);
		}

		// Pega o userId do cookie/session
		const sessionCookie = cookies.get('session');
		if (!sessionCookie) {
			return json(
				{
					success: false,
					message: 'Sessão expirada. Faça login novamente.'
				},
				{ status: 401 }
			);
		}

		// Decodifica o JWT ou get user ID (depende da implementação)
		// Aqui vou assumir que você tem um middleware que extrai o user
		// Se não tiver, você pode extrair do JWT do cookie
		const userPayload = JSON.parse(Buffer.from(sessionCookie.split('.')[1], 'base64').toString());
		const userId = userPayload.id || userPayload.sub;

		if (!userId) {
			return json(
				{
					success: false,
					message: 'Não foi possível identificar o usuário'
				},
				{ status: 401 }
			);
		}

		// Verifica se o novo email já existe (se for diferente do atual)
		const user = await Users.findById(userId);

		if (!user) {
			return json(
				{
					success: false,
					message: 'Usuário não encontrado'
				},
				{ status: 404 }
			);
		}

		// Se email foi mudado, verifica se já não existe
		if (data.email !== user.email) {
			const existingUser = await Users.findOne({ email: data.email });
			if (existingUser) {
				return json(
					{
						success: false,
						message: 'Este email já está registrado'
					},
					{ status: 400 }
				);
			}
		}

		// Atualiza os dados
		user.firstName = data.firstName;
		user.lastName = data.lastName;
		user.email = data.email;
		user.country = data.country || '';
		user.dob = data.dob || '';
		user.profileCompletedAt = new Date(); // Flag para rastrear quando completou

		await user.save();

		console.log(`✅ Profile completed for user ${userId}`);

		return json(
			{
				success: true,
				message: 'Perfil atualizado com sucesso'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('❌ Error completing profile:', error);
		return json(
			{
				success: false,
				message: 'Erro ao atualizar perfil. Tente novamente.'
			},
			{ status: 500 }
		);
	}
};
