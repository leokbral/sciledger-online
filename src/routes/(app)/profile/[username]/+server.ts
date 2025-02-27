import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import Users from '$lib/db/models/User';
import { start_mongo } from '$lib/db/mongooseConnection';

export const PUT: RequestHandler = async ({ request }) => {
	await start_mongo(); // Inicializa a conexão com o banco de dados

	try {
		const { id, position, institution, bio } = await request.json();

		// Verifica se todas as informações necessárias foram enviadas
		if (!id || !position || !institution) {
			return json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
		}

		// Verifica se o usuário existe pelo ID
		const existingUser = await Users.findOne({ id });
		if (!existingUser) {
			return json({ error: 'Usuário não encontrado.' }, { status: 404 });
		}

		// Atualiza as informações do usuário
		const updatedUser = await Users.findOneAndUpdate(
			{ id },
			{ $set: { position, institution, bio, updatedAt: new Date() } },
			{ new: true } // Retorna o documento atualizado
		);

		// Resposta de sucesso
		return json({ user: updatedUser }, { status: 200 });
	} catch (error) {
		console.error('Erro ao atualizar usuário:', error);
		return json({ error: 'Erro interno do servidor.' }, { status: 500 });
	}
};
