import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Compatibilidade adicional para URI antiga registrada no ORCID.
 */
export const GET: RequestHandler = async ({ url }) => {
	const target = `/api/orcid/callback${url.search}`;
	redirect(302, target);
};
