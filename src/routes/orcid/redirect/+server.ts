import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { ORCID_CLIENT_ID, ORCID_REDIRECT_URI, ORCID_SANDBOX } from '$env/static/private';

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
	console.log('🔵 ORCID Redirect - Starting...');
	
	// Valida que as variáveis de ambiente estão configuradas
	if (!ORCID_CLIENT_ID || !ORCID_REDIRECT_URI) {
		console.error('❌ ORCID credentials not configured');
		throw redirect(302, '/login?error=orcid_config_error');
	}

	const useSandbox = ORCID_SANDBOX === 'true';
	const ORCID_AUTH_URL = useSandbox
		? 'https://sandbox.orcid.org/oauth/authorize'
		: 'https://orcid.org/oauth/authorize';

	// Parâmetros necessários para OAuth 2.0
	const params = new URLSearchParams({
		client_id: ORCID_CLIENT_ID,
		response_type: 'code', // Authorization Code Flow
		scope: '/authenticate', // Permissão para autenticar e obter ORCID iD
		redirect_uri: ORCID_REDIRECT_URI
	});

	// Redireciona para página de autorização do ORCID
	const authUrl = `${ORCID_AUTH_URL}?${params.toString()}`;
	console.log('✅ Redirecting to ORCID', { useSandbox });
	
	throw redirect(302, authUrl);
};
