import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Rota de compatibilidade - redireciona para /orcid/redirect
 * Mantida para compatibilidade com código antigo
 */
export const GET: RequestHandler = async () => {
	// Redireciona para a rota correta
	throw redirect(302, '/orcid/redirect');
};
