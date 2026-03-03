import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Compatibilidade com redirect URI registrada no ORCID:
 * /orcid/callback -> redireciona para o callback real em /api/orcid/callback
 */
export const GET: RequestHandler = async ({ url }) => {
	const target = `/api/orcid/callback${url.search}`;
	redirect(302, target);
};
