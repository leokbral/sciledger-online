import { error, redirect } from '@sveltejs/kit';
import Papers from '$lib/db/models/Paper.js';
import Users from '$lib/db/models/User.js';
import '$lib/db/mongooseConnection.js';

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, `/login`);

	try {
		// Buscar o paper pelo ID
		const paper = await Papers.findById(params.slug)
			.populate('mainAuthor')
			.populate('coAuthors')
			.populate('correspondingAuthor')
			.lean();

		if (!paper) {
			throw error(404, 'Paper not found');
		}

		// Verificar se o usuário tem permissão para editar este paper
		const userId = locals.user.id;
		const canEdit = paper.mainAuthor._id.toString() === userId || 
			paper.coAuthors.some((author: { _id: { toString: () => string } }) => author._id.toString() === userId) ||
			paper.correspondingAuthor._id.toString() === userId;

		if (!canEdit) {
			throw error(403, 'You do not have permission to edit this paper');
		}

		// Buscar todos os usuários para as opções de autores
		const users = await Users.find({}).lean();

		return {
			paper: JSON.parse(JSON.stringify(paper)),
			users: JSON.parse(JSON.stringify(users)),
			user: locals.user
		};
	} catch (err) {
		console.error('Error loading paper:', err);
		throw error(500, 'Internal server error');
	}
}


export const actions = {
	default: async ({ locals /* , params, request */ }) => {
		if (!locals.user) error(401);

		/* const data = await request.formData();

		const result = await api.put(
			`articles/${params.slug}`,
			{
				article: {
					title: data.get('title'),
					description: data.get('description'),
					body: data.get('body'),
					tagList: data.getAll('tag')
				}
			},
			locals.user.token
		);

		if (result.errors) error(400, result.errors); */

		//redirect(303, `/article/${result.article.slug}`);
	}
};