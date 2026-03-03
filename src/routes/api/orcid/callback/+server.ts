import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeOrcidCode, fetchOrcidUserData, type OrcidUserData } from '$lib/orcid/orcidService';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import * as crypto from 'crypto';
import * as cookie from 'cookie';
import { AUTH_CONFIG_SECRET } from '$env/static/private';

type SessionUser = {
	id: string;
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	roles: { author: boolean; reviewer: boolean };
	profilePictureUrl: string;
	bio: string;
	orcid?: string;
};

function buildSessionCookie(user: SessionUser): string {
	const value = Buffer.from(JSON.stringify({ user })).toString('base64');
	return `jwt=${value}; Path=/; HttpOnly; SameSite=Lax`;
}

/**
 * Rota de callback ORCID - Processamento do authorization_code
 * 
 * Fluxo:
 * 1. Recebe o authorization_code do ORCID
 * 2. Troca o code por access_token
 * 3. Busca dados do usuário no ORCID
 * 4. Verifica se usuário já existe (por ORCID ou email)
 * 5. Cria novo usuário OU associa ORCID a existente
 * 6. Retorna resposta de login (compatível com seu fluxo atual)
 */
export const GET: RequestHandler = async ({ url, request }) => {
	try {
		// Inicia conexão com MongoDB
		await start_mongo();

		// Obtém os parâmetros da URL
		const authorizationCode = url.searchParams.get('code');
		const errorParam = url.searchParams.get('error');
		const state = url.searchParams.get('state');

		// Se o usuário negar a autorização no ORCID, a plataforma retorna `error`.
		if (errorParam) {
			console.warn('ORCID authorization error:', errorParam);
			return redirect(302, `/login?error=${errorParam}`);
		}

		// Validação anti-CSRF (`state`)
		const cookies = cookie.parse(request.headers.get('cookie') || '');
		const expectedState = cookies.orcid_oauth_state;
		let returnTo = '/';
		if (cookies.orcid_oauth_return_to) {
			try {
				returnTo = decodeURIComponent(cookies.orcid_oauth_return_to);
			} catch {
				returnTo = '/';
			}
		}

		if (!state || !expectedState || state !== expectedState) {
			console.error('Invalid ORCID OAuth state');
			return redirect(302, '/login?error=invalid_orcid_state');
		}

		// Valida se recebemos o código
		if (!authorizationCode) {
			console.error('No authorization code received from ORCID');
			return redirect(302, '/login?error=no_authorization_code');
		}

		// PASSO 1: Troca o authorization_code por access_token
		console.log('Exchanging ORCID authorization code...');
		const tokenResponse = await exchangeOrcidCode(authorizationCode);
		
		if (!tokenResponse.access_token || !tokenResponse.orcid) {
			console.error('Failed to get access token from ORCID');
			return redirect(302, '/login?error=token_exchange_failed');
		}

		console.log(`Successfully obtained ORCID access token for ORCID: ${tokenResponse.orcid}`);

		// PASSO 2: Busca dados do usuário no ORCID
		const userData: OrcidUserData = await fetchOrcidUserData(tokenResponse.orcid, tokenResponse.access_token);
		userData.orcid = tokenResponse.orcid;
		userData.name = userData.name || tokenResponse.name || '';

		// Se não tem firstName/lastName separados, tenta dividir o name
		if (!userData.firstName && userData.name) {
			const nameParts = userData.name.split(' ');
			userData.firstName = nameParts[0];
			userData.lastName = nameParts.slice(1).join(' ') || '';
		}

		console.log('Extracted ORCID user data:', { orcid: userData.orcid, email: userData.email });

		// PASSO 3: Verifica se usuário já existe
		// Busca por ORCID primeiro
		let existingUser = await Users.findOne({ orcid: userData.orcid });

		if (existingUser) {
			// Usuário já existe e já foi conectado ao ORCID antes
			console.log('User already exists with this ORCID. Logging in...');
			
			// Atualiza tokens ORCID (no caso de refresh)
			existingUser.orcidAccessToken = tokenResponse.access_token;
			if (tokenResponse.refresh_token) {
				existingUser.orcidRefreshToken = tokenResponse.refresh_token;
			}
			existingUser.updatedAt = new Date().toISOString();
			await existingUser.save();

			const sessionUser: SessionUser = {
				id: existingUser.id || existingUser._id?.toString(),
				email: existingUser.email,
				username: existingUser.username,
				firstName: existingUser.firstName,
				lastName: existingUser.lastName,
				roles: existingUser.roles,
				profilePictureUrl: existingUser.profilePictureUrl || '',
				bio: existingUser.bio || '',
				orcid: existingUser.orcid
			};

			const headers = new Headers();
			headers.set('location', returnTo || '/');
			headers.append('set-cookie', buildSessionCookie(sessionUser));
			headers.append('set-cookie', 'orcid_oauth_state=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
			headers.append('set-cookie', 'orcid_oauth_return_to=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

			return new Response(null, {
				status: 302,
				headers
			});
		}

		// Se não existe por ORCID, busca por email (para associação)
		if (userData.email) {
			existingUser = await Users.findOne({ email: userData.email });
		}

		// PASSO 4: Lógica de criar novo usuário ou associar ORCID
		if (!existingUser) {
			// Não existe usuário com esse ORCID nem com esse email
			// Cria novo usuário
			console.log('Creating new user with ORCID...');

			// Gera ID e username único
			const userId = crypto.randomUUID();
			
			// Cria username a partir do ORCID ou do firstName
			const baseUsername = userData.firstName?.toLowerCase().replace(/\s+/g, '') || 'orcid';
			let username = `@${baseUsername}`;
			let counter = 1;

			// Garante que o username é único
			while (await Users.findOne({ username })) {
				username = `@${baseUsername}${counter}`;
				counter++;
			}

			// Cria novo usuário com senha aleatória em hash (fluxo principal é OAuth)
			const generatedPassword = crypto.randomUUID();
			const hashedPassword = crypto
				.pbkdf2Sync(generatedPassword, AUTH_CONFIG_SECRET, 1000, 64, 'sha512')
				.toString('hex');

			const newUserData = {
				_id: userId,
				id: userId,
				firstName: userData.firstName || 'ORCID',
				lastName: userData.lastName || 'User',
				email: userData.email || `${userId}@orcid-linked.local`, // Email placeholder se não fornecido
				username: username,
				password: hashedPassword,
				country: 'Unknown',
				dob: '1900-01-01',
				emailVerified: true, // Email verificado via ORCID
				roles: {
					author: true,
					reviewer: false
				},
				orcid: userData.orcid,
				orcidAccessToken: tokenResponse.access_token,
				orcidRefreshToken: tokenResponse.refresh_token,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			existingUser = new Users(newUserData);
			await existingUser.save();

			console.log(`New user created with ID ${userId} and ORCID ${userData.orcid}`);
		} else {
			// Usuário existe com esse email, associa ORCID
			console.log(`User exists with email ${userData.email}. Associating ORCID...`);

			existingUser.orcid = userData.orcid;
			existingUser.orcidAccessToken = tokenResponse.access_token;
			if (tokenResponse.refresh_token) {
				existingUser.orcidRefreshToken = tokenResponse.refresh_token;
			}
			existingUser.emailVerified = true; // Marca como verificado via ORCID
			existingUser.updatedAt = new Date().toISOString();
			await existingUser.save();

			console.log(`ORCID ${userData.orcid} associated with existing user ${existingUser._id}`);
		}

		// PASSO 5: Login usando o mesmo cookie do fluxo atual e redireciona para app.
		const sessionUser: SessionUser = {
			id: existingUser.id || existingUser._id?.toString(),
			email: existingUser.email,
			username: existingUser.username,
			firstName: existingUser.firstName,
			lastName: existingUser.lastName,
			roles: existingUser.roles,
			profilePictureUrl: existingUser.profilePictureUrl || '',
			bio: existingUser.bio || '',
			orcid: existingUser.orcid
		};

		const headers = new Headers();
		headers.set('location', returnTo || '/');
		headers.append('set-cookie', buildSessionCookie(sessionUser));
		headers.append('set-cookie', 'orcid_oauth_state=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
		headers.append('set-cookie', 'orcid_oauth_return_to=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

		return new Response(null, {
			status: 302,
			headers
		});
	} catch (error) {
		console.error('ORCID callback error:', error);
		
		// Tenta retornar erro detalhado em modo de desenvolvimento
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return redirect(302, `/login?error=orcid_callback_error&details=${encodeURIComponent(errorMessage)}`);
	}
};
