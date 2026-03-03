import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { ORCID_CLIENT_ID, ORCID_REDIRECT_URI } from '$env/static/private';

/**
 * Rota para iniciar o fluxo OAuth 2.0 com ORCID
 * 
 * Este endpoint redireciona o usuário para a página de autorização do ORCID
 * onde ele poderá fazer login e autorizar o acesso aos seus dados.
 * 
 * Fluxo:
 * 1. Usuário clica em "Login com ORCID"
 * 2. É redirecionado para esta rota
 * 3. Esta rota redireciona para o ORCID
 * 4. Usuário autoriza no ORCID
 * 5. ORCID redireciona para /orcid/callback com authorization_code
 */
export const GET: RequestHandler = async () => {
	try {
		// Valida que as variáveis de ambiente estão configuradas
		if (!ORCID_CLIENT_ID || !ORCID_REDIRECT_URI) {
			throw new Error('ORCID credentials not configured');
		}

		// URL de autorização do ORCID - PRODUÇÃO
		const ORCID_AUTH_URL = 'https://orcid.org/oauth/authorize';

		// Parâmetros necessários para OAuth 2.0
		const params = new URLSearchParams({
			client_id: ORCID_CLIENT_ID,
			response_type: 'code', // Authorization Code Flow
			scope: '/authenticate', // Permissão para autenticar e obter ORCID iD
			redirect_uri: ORCID_REDIRECT_URI
		});

		// Redireciona para página de autorização do ORCID
		const authUrl = `${ORCID_AUTH_URL}?${params.toString()}`;
		
		throw redirect(302, authUrl);
	} catch (error) {
		console.error('Error redirecting to ORCID:', error);
		// Em caso de erro, redireciona para login com mensagem de erro
		throw redirect(302, '/login?error=orcid_config_error');
	}
};
