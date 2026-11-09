import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { ORCID_CLIENT_ID } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { getOrcidRedirectUri } from '$lib/server/orcid/redirectUri';
import { hubLoginReturnTo } from '$lib/helpers/authReturnTo';
import { AUTH_RETURN_TO_COOKIE } from '$lib/server/auth/returnTo';
import { isSecureRequest } from '$lib/server/auth/sessionCookie';

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
export const GET: RequestHandler = async ({ url, request, cookies, locals }) => {
	cookies.delete(AUTH_RETURN_TO_COOKIE, { path: '/' });
	// Valida que as variáveis de ambiente estão configuradas
	if (!ORCID_CLIENT_ID) {
		console.error('❌ ORCID credentials not configured');
		throw redirect(302, '/login?error=orcid_config_error');
	}
	const returnTo = locals.user ? '/' : hubLoginReturnTo(url.searchParams);
	if (returnTo !== '/') {
		cookies.set(AUTH_RETURN_TO_COOKIE, returnTo, {
			path: '/', httpOnly: true, sameSite: 'lax', secure: isSecureRequest(url, request), maxAge: 3600
		});
	}

	const useSandbox = env.ORCID_SANDBOX === 'true';
	const ORCID_AUTH_URL = useSandbox
		? 'https://sandbox.orcid.org/oauth/authorize'
		: 'https://orcid.org/oauth/authorize';
	const redirectUri = getOrcidRedirectUri(url.origin);

	// Parâmetros necessários para OAuth 2.0
	const params = new URLSearchParams({
		client_id: ORCID_CLIENT_ID,
		response_type: 'code', // Authorization Code Flow
		scope: '/authenticate', // Permissão para autenticar e obter ORCID iD
		redirect_uri: redirectUri
	});

	// Redireciona para página de autorização do ORCID
	const authUrl = `${ORCID_AUTH_URL}?${params.toString()}`;
	throw redirect(302, authUrl);
};
