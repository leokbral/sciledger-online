import { error, redirect } from '@sveltejs/kit';
import Papers from '$lib/db/models/Paper.js';
import Users from '$lib/db/models/User.js';
import '$lib/db/mongooseConnection.js';
import { collectReusableAffiliations } from '$lib/utils/paperAuthorAffiliations';

function getReferenceId(value: any): string {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (value.id) return String(value.id);
	if (value._id) return String(value._id);
	return '';
}

/**
 * Affiliations this user already used on their own papers, offered in the editor so the same
 * institution never has to be retyped. Only the requesting user's own author snapshots are
 * read: this is not a global institution directory, and no other author's data is exposed.
 */
async function loadKnownAffiliations(userId: string) {
	if (!userId) return [];

	const papers = await Papers.find({ 'authorAffiliations.userId': userId }, { authorAffiliations: 1 })
		.sort({ updatedAt: -1 })
		.limit(50)
		.lean()
		.exec();

	const affiliations = papers.flatMap((paper: any) =>
		(paper?.authorAffiliations ?? [])
			.filter((author: any) => String(author?.userId ?? '') === userId)
			.flatMap((author: any) => author?.affiliations ?? [])
	);

	return collectReusableAffiliations(affiliations).map((entry) => entry.affiliation);
}

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
		const canEdit = getReferenceId(paper.mainAuthor) === userId ||
			(Array.isArray(paper.coAuthors) && paper.coAuthors.some((author: any) => getReferenceId(author) === userId)) ||
			getReferenceId(paper.correspondingAuthor) === userId;

		if (!canEdit) {
			throw error(403, 'You do not have permission to edit this paper');
		}

		// Buscar todos os usuários para as opções de autores
		const users = await Users.find({}).lean();

		const knownAffiliations = await loadKnownAffiliations(String(locals.user.id ?? ''));

		return {
			paper: JSON.parse(JSON.stringify(paper)),
			users: JSON.parse(JSON.stringify(users)),
			user: locals.user,
			knownAffiliations: JSON.parse(JSON.stringify(knownAffiliations))
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
