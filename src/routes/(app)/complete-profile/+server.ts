import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';

interface CompleteProfileRequest {
	firstName: string;
	lastName: string;
	email?: unknown;
	country?: string;
	dob?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		await start_mongo();

		const data: CompleteProfileRequest = await request.json();

		// Valida dados obrigatórios
		if (!data.firstName || !data.lastName) {
			return json(
				{
					success: false,
					message: 'Primeiro nome e sobrenome são obrigatórios'
				},
				{ status: 400 }
			);
		}

		// complete-profile only ever manages profile fields (name, country,
		// birthday, ...). Email changes require proof of ownership and must go
		// through POST /api/account/email-change instead -- reject the field
		// here rather than silently accepting or ignoring it, so a caller still
		// sending it gets a clear signal to switch endpoints.
		if (typeof data.email === 'string' && data.email.trim()) {
			return json(
				{
					success: false,
					message:
						'Email changes are not supported here. Use POST /api/account/email-change instead.'
				},
				{ status: 400 }
			);
		}

		const userId = locals.user?.id ? String(locals.user.id) : null;

		if (!userId) {
			return json(
				{
					success: false,
					message: 'Não foi possível identificar o usuário'
				},
				{ status: 401 }
			);
		}

		const user = await Users.findOne({ $or: [{ id: userId }, { _id: userId }] });

		if (!user) {
			return json(
				{
					success: false,
					message: 'Usuário não encontrado'
				},
				{ status: 404 }
			);
		}

		// Atualiza os dados
		user.firstName = data.firstName;
		user.lastName = data.lastName;
		user.country = data.country || '';
		user.dob = data.dob || '';
		user.profileCompletedAt = new Date(); // Flag para rastrear quando completou

		await user.save();

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
