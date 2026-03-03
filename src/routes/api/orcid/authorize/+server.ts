import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as crypto from 'crypto';
import { getOrcidConfig } from '$lib/orcid/config';

/**
 * Rota para iniciar o fluxo OAuth 2.0 com ORCID
 * 
 * Redireciona o usuário para o formulário de autorização do ORCID
 * O usuário terá que fazer login e autorizar a aplicação
 * 
 * Após autorização, ORCID redireciona para /api/orcid/callback com um authorization_code
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const orcidConfig = getOrcidConfig();
		
		console.log('[ORCID Authorize] Starting authorization flow');
		console.log('[ORCID Authorize] NODE_ENV:', process.env.NODE_ENV);
		console.log('[ORCID Authorize] Config resolved:', orcidConfig ? 'YES' : 'NO');
		
		if (!orcidConfig) {
			console.error('[ORCID Authorize] ORCID configuration missing');
			console.error('[ORCID Authorize] Available env vars:');
			console.error('  ORCID_CLIENT_ID:', process.env.ORCID_CLIENT_ID ? '***set***' : 'MISSING');
			console.error('  ORCID_PROD_CLIENT_ID:', process.env.ORCID_PROD_CLIENT_ID ? '***set***' : 'MISSING');
			console.error('  ORCID_SANDBOX_CLIENT_ID:', process.env.ORCID_SANDBOX_CLIENT_ID ? '***set***' : 'MISSING');
			throw new Error('ORCID OAuth is not properly configured');
		}

		console.log('[ORCID Authorize] Config found - ClientID starts with:', orcidConfig.clientId.substring(0, 5));
		console.log('[ORCID Authorize] Redirect URI:', orcidConfig.redirectUri);

		// `returnTo` permite voltar para uma rota específica após autenticação.
		// Exemplo: /api/orcid/authorize?returnTo=/dashboard
		const returnTo = url.searchParams.get('returnTo') || '/';

		// Gera estado anti-CSRF
		const state = crypto.randomBytes(24).toString('hex');

		// Define os parâmetros para a requisição OAuth 2.0
		const params = new URLSearchParams({
			client_id: orcidConfig.clientId,
			response_type: 'code', // Fluxo de autorização com code, não implicit
			scope: '/authenticate', // Escopos necessários
			redirect_uri: orcidConfig.redirectUri,
			state
		});

		// Produção por padrão.
		const orcidAuthUrl = `https://orcid.org/oauth/authorize?${params.toString()}`;

		console.log('[ORCID Authorize] Redirecting to ORCID:', orcidAuthUrl.substring(0, 80) + '...');

		// Salva estado e destino em cookies HttpOnly temporários.
		const headers = new Headers();
		headers.set('location', orcidAuthUrl);
		headers.append('set-cookie', `orcid_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
		headers.append('set-cookie', `orcid_oauth_return_to=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

		return new Response(null, {
			status: 302,
			headers
		});
	} catch (err) {
		console.error('[ORCID Authorize] ERROR:', err);
		console.error('[ORCID Authorize] Stack:', err instanceof Error ? err.stack : 'No stack');
		redirect(302, '/login?error=orcid_auth_failed');
	}
};
