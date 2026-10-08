import type { RequestHandler } from './$types';
import { isRedirect, redirect } from '@sveltejs/kit';
import { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import { respondWithSession } from '$lib/server/auth/authResponse';
import { normalizeEmail } from '$lib/server/auth/normalizeEmail';
import { getOrcidRedirectUri } from '$lib/server/orcid/redirectUri';
import { createOrcidUser } from '$lib/server/orcid/createOrcidUser';
import OrcidSignupClaim from '$lib/db/models/OrcidSignupClaim';
import {
	getOrcidSignupExpiresAt,
	serializeOrcidSignupCookie
} from '$lib/server/auth/orcidSignupClaim';
import { isSecureRequest } from '$lib/server/auth/sessionCookie';
import {
	buildOrcidPlaceholderEmail,
	isOrcidPlaceholderEmail
} from '$lib/helpers/orcidPlaceholderEmail';

/**
 * Verifica se o perfil do usuário está completo
 * Retorna true se todos os dados essenciais foram preenchidos
 *
 * O endereço de e-mail deliberadamente NÃO bloqueia mais este teste. Contas
 * ORCID sem e-mail público recebem um placeholder (ver
 * `$lib/helpers/orcidPlaceholderEmail`),
 * e /complete-profile não pode trocá-lo: POST /complete-profile rejeita o campo
 * `email` com 400, porque trocar de endereço exige prova de posse e só acontece
 * via POST /api/account/email-change. Exigir um e-mail real aqui prendia esses
 * usuários em /complete-profile a cada login, sem nenhuma saída possível.
 *
 * O sinal de conclusão passa a ser `profileCompletedAt`, gravado por
 * /complete-profile justamente para isso. O e-mail real continua valendo como
 * sinal alternativo para não mandar contas antigas -- criadas por e-mail/senha,
 * portanto sem `profileCompletedAt` -- para uma tela que elas não precisam.
 */
function isProfileComplete(user: any): boolean {
	const hasRealName = !!(
		user.firstName &&
		user.firstName !== 'User' &&
		user.lastName &&
		user.lastName !== 'ORCID'
	);

	if (!hasRealName) {
		return false;
	}

	const completedExplicitly = !!user.profileCompletedAt;
	const hasRealEmail = !!(user.email && !isOrcidPlaceholderEmail(user.email));

	return completedExplicitly || hasRealEmail;
}

/**
 * Parks an ORCID identity that arrived without a usable e-mail address and
 * sends the browser to the form that asks for one.
 *
 * No account is created here. Until the person confirms an address we cannot
 * tell whether they already have one, and guessing is what used to produce a
 * second, orphan account with an invented `@orcid.placeholder` address.
 *
 * The browser carries only the claim's id, in an httpOnly cookie. Holding it
 * lets someone name an address and have a confirmation link sent THERE, which
 * is no privilege at all: the link is the proof, and it lands in that mailbox.
 */
async function parkClaimAndAskForEmail(
	claim: { orcid: string; firstName: string; lastName: string },
	request: Request,
	url: URL
): Promise<Response> {
	const now = new Date();
	const saved = await OrcidSignupClaim.findOneAndUpdate(
		{ orcid: claim.orcid },
		{
			$set: {
				firstName: claim.firstName,
				lastName: claim.lastName,
				expiresAt: getOrcidSignupExpiresAt(now),
				updatedAt: now
			},
			// A restarted sign-up must not inherit an address or token from an
			// abandoned attempt.
			$unset: { pendingEmail: '', tokenHash: '' }
		},
		{ new: true, upsert: true, setDefaultsOnInsert: true }
	);

	const headers = new Headers({ Location: '/orcid/email' });
	headers.append(
		'set-cookie',
		serializeOrcidSignupCookie(String(saved.id), { secure: isSecureRequest(url, request) })
	);

	return new Response(null, { status: 302, headers });
}

/**
 * Faz login e redireciona para a página correta
 */
async function loginAndRedirect(user: any, request: Request, url: URL): Promise<Response> {
	const response = await respondWithSession({ user }, { request, url });
	const redirectPath = isProfileComplete(user) ? '/' : '/complete-profile';
	response.headers.set('Location', redirectPath);

	return new Response(null, {
		status: 302,
		headers: response.headers
	});
}

/**
 * Rota de callback OAuth 2.0 do ORCID
 * 
 * Esta rota é chamada pelo ORCID após o usuário autorizar o acesso.
 * Recebe um authorization_code e realiza as seguintes operações:
 * 
 * 1. Troca authorization_code por access_token
 * 2. Busca dados do usuário no ORCID
 * 3. Verifica se usuário já existe (por ORCID ou email)
 * 4. Cria novo usuário ou atualiza existente
 * 5. Faz login usando o sistema atual
 */
export const GET: RequestHandler = async ({ url, request }) => {
	try {
		await start_mongo();

		// Extrai o authorization_code da URL
		const code = url.searchParams.get('code');
		const error = url.searchParams.get('error');

		// Verifica se houve erro na autorização
		if (error) {
			console.error('❌ ORCID authorization error:', error);
			throw redirect(302, '/login?error=orcid_authorization_denied');
		}

		// Verifica se o code foi fornecido
		if (!code) {
			console.error('❌ Missing authorization code');
			throw redirect(302, '/login?error=missing_authorization_code');
		}

		// Valida configuração
		if (!ORCID_CLIENT_ID || !ORCID_CLIENT_SECRET) {
			console.error('❌ ORCID credentials not configured');
			throw new Error('ORCID credentials not configured');
		}
		const useSandbox = env.ORCID_SANDBOX === 'true';
		const redirectUri = getOrcidRedirectUri(url.origin);

		// ====================================================================
		// ETAPA 1: Trocar authorization_code por access_token
		// ====================================================================
		
		const ORCID_TOKEN_URL = useSandbox
			? 'https://sandbox.orcid.org/oauth/token'
			: 'https://orcid.org/oauth/token';
		
		const tokenParams = new URLSearchParams({
			client_id: ORCID_CLIENT_ID,
			client_secret: ORCID_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: redirectUri
		});

		const tokenResponse = await fetch(ORCID_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: tokenParams.toString()
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error('❌ Failed to exchange code for token:', errorData);
			throw redirect(302, '/login?error=token_exchange_failed');
		}

		const tokenData = await tokenResponse.json();
		
		// Dados retornados pelo ORCID
		const {
			access_token,
			refresh_token,
			expires_in,
			orcid, // ORCID iD do usuário
			name // Nome completo do usuário
		} = tokenData;

		// ====================================================================
		// ETAPA 2: Buscar informações detalhadas do usuário no ORCID
		// ====================================================================
		
		const ORCID_API_BASE = useSandbox ? 'https://pub.sandbox.orcid.org/v3.0' : 'https://pub.orcid.org/v3.0';
		const ORCID_API_URL = `${ORCID_API_BASE}/${orcid}/person`;
		
		const personResponse = await fetch(ORCID_API_URL, {
			headers: {
				'Accept': 'application/json',
				'Authorization': `Bearer ${access_token}`
			}
		});

		let firstName = '';
		let lastName = '';
		let email = '';

		if (personResponse.ok) {
			const personData = await personResponse.json();
			
			// Extrai nome
			if (personData.name) {
				firstName = personData.name['given-names']?.value || '';
				lastName = personData.name['family-name']?.value || '';
			}

			// Extrai email (se disponível e público)
			if (personData.emails?.email && personData.emails.email.length > 0) {
				// Busca o email primário ou o primeiro disponível
				const primaryEmail = personData.emails.email.find((e: any) => e.primary === true);
				email = primaryEmail?.email || personData.emails.email[0]?.email || '';
			}
		}

		// Normaliza (trim + lowercase) antes de qualquer busca/gravação -- sem
		// isso, um email vindo do ORCID com capitalização diferente da já
		// armazenada nunca daria match e criaria uma conta duplicada.
		email = normalizeEmail(email);

		// Fallback: se não conseguiu extrair nome da API, usa o 'name' do token
		if (!firstName && !lastName && name) {
			const nameParts = name.split(' ');
			firstName = nameParts[0] || 'User';
			lastName = nameParts.slice(1).join(' ') || 'ORCID';
		}

		// Se ainda não tem nome, usa padrão
		if (!firstName) firstName = 'User';
		if (!lastName) lastName = 'ORCID';

		// ====================================================================
		// ETAPA 3: Verificar se usuário já existe
		// ====================================================================

		// 3.1: Buscar por ORCID iD
		let user = await Users.findOne({ orcid: orcid });

		if (user) {
			// Usuário já existe com este ORCID - Fazer login

			// Atualiza tokens ORCID
			user.orcidAccessToken = access_token;
			user.orcidRefreshToken = refresh_token || user.orcidRefreshToken;
			user.orcidTokenExpiry = new Date(Date.now() + expires_in * 1000);
			await user.save();

			// Faz login e redireciona para home ou complete-profile
			return loginAndRedirect(user, request, url);
		}

		// 3.2: Se tem email, buscar por email
		if (email) {
			user = await Users.findOne({ email: email });

			if (user) {
				// Usuário já existe com este email - Associar ORCID

				// Associa ORCID ao usuário existente
				user.orcid = orcid;
				user.orcidAccessToken = access_token;
				user.orcidRefreshToken = refresh_token;
				user.orcidTokenExpiry = new Date(Date.now() + expires_in * 1000);
				user.emailVerified = true; // Public ORCID email is treated as verified by ORCID.
				user.emailVerifiedAt = user.emailVerifiedAt || new Date();
				user.verificationSource = 'orcid';
				await user.save();

				// Faz login e redireciona para home ou complete-profile
				return loginAndRedirect(user, request, url);
			}
		}

		// ====================================================================
		// ETAPA 4: Criar novo usuário
		// ====================================================================

		// O ORCID publicou o e-mail: ele serve como prova de posse, entao a conta
		// e criada aqui mesmo, ja verificada.
		if (email) {
			const newUser = await createOrcidUser({
				orcid,
				firstName,
				lastName,
				email,
				verificationSource: 'orcid',
				accessToken: access_token,
				refreshToken: refresh_token,
				tokenExpiry: new Date(Date.now() + expires_in * 1000)
			});

			return loginAndRedirect(newUser, request, url);
		}

		// Sem e-mail publico. Contas criadas pelo fluxo antigo carregam o
		// placeholder deterministico deste ORCID iD; a ETAPA 3.1 normalmente as
		// encontra pelo proprio iD, e esta busca cobre as que por algum motivo
		// ficaram sem ele. Elas continuam entrando como sempre -- o aviso em
		// /settings/account e que as conduz a cadastrar um endereco real.
		const legacyPlaceholderUser = await Users.findOne({
			email: buildOrcidPlaceholderEmail(orcid)
		});

		if (legacyPlaceholderUser) {
			legacyPlaceholderUser.orcid = orcid;
			legacyPlaceholderUser.orcidAccessToken = access_token;
			legacyPlaceholderUser.orcidRefreshToken = refresh_token;
			legacyPlaceholderUser.orcidTokenExpiry = new Date(Date.now() + expires_in * 1000);
			await legacyPlaceholderUser.save();

			return loginAndRedirect(legacyPlaceholderUser, request, url);
		}

		// Conta nova sem e-mail conhecido: nada e criado ainda. A identidade do
		// ORCID fica parada num registro temporario e o navegador vai para o
		// formulario que pede o endereco. Inventar um placeholder aqui era o que
		// gerava a segunda conta orfa, impossivel de unificar depois.
		return parkClaimAndAskForEmail({ orcid, firstName, lastName }, request, url);

	} catch (error) {
		console.error('❌ ORCID callback error:', error);
		
		// Se for um redirect, propaga
		if (isRedirect(error)) {
			throw error;
		}
		
		// Senão, redireciona para login com erro
		console.error('❌ Redirecting to login with error');
		throw redirect(302, '/login?error=orcid_callback_failed');
	}
};
