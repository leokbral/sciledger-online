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
		console.log('[ORCID Callback] === STARTING ORCID CALLBACK ===');
		
		// Inicia conexão com MongoDB
		console.log('[ORCID Callback] Connecting to MongoDB...');
		await start_mongo();
		console.log('[ORCID Callback] MongoDB connected');

		// Obtém os parâmetros da URL
		const authorizationCode = url.searchParams.get('code');
		const errorParam = url.searchParams.get('error');
		const state = url.searchParams.get('state');

		console.log('[ORCID Callback] URL params:', { 
			authorizationCode: authorizationCode ? 'received' : 'MISSING',
			errorParam: errorParam || 'none',
			state: state ? state.substring(0, 8) + '...' : 'MISSING'
		});

		// Se o usuário negar a autorização no ORCID, a plataforma retorna `error`.
		if (errorParam) {
			console.error('[ORCID Callback] ORCID authorization error:', errorParam);
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

		console.log('[ORCID Callback] State validation:', { 
			stateFromUrl: state ? state.substring(0, 8) + '...' : 'MISSING',
			stateFromCookie: expectedState ? expectedState.substring(0, 8) + '...' : 'MISSING',
			match: state === expectedState
		});

		if (!state || !expectedState || state !== expectedState) {
			console.error('[ORCID Callback] Invalid ORCID OAuth state - CSRF protection triggered');
			return redirect(302, '/login?error=invalid_orcid_state');
		}

		// Valida se recebemos o código
		if (!authorizationCode) {
			console.error('[ORCID Callback] No authorization code received from ORCID');
			return redirect(302, '/login?error=no_authorization_code');
		}

		// PASSO 1: Troca o authorization_code por access_token
		console.log('[ORCID Callback] PASSO 1: Exchanging authorization code for access token...');
		let tokenResponse;
		try {
			tokenResponse = await exchangeOrcidCode(authorizationCode);
			console.log('[ORCID Callback] Token exchange success:', { orcid: tokenResponse.orcid });
		} catch (err) {
			console.error('[ORCID Callback] Token exchange failed:', err instanceof Error ? err.message : err);
			return redirect(302, '/login?error=token_exchange_failed');
		}
		
		if (!tokenResponse.access_token || !tokenResponse.orcid) {
			console.error('[ORCID Callback] Invalid token response:', { 
				hasAccessToken: !!tokenResponse.access_token,
				hasOrcid: !!tokenResponse.orcid,
				keys: Object.keys(tokenResponse)
			});
			return redirect(302, '/login?error=token_exchange_failed');
		}

		console.log(`[ORCID Callback] ✓ Successfully obtained access token for ORCID: ${tokenResponse.orcid}`);

		// PASSO 2: Busca dados do usuário no ORCID
		console.log('[ORCID Callback] PASSO 2: Fetching user data from ORCID...');
		let userData: OrcidUserData;
		try {
			userData = await fetchOrcidUserData(tokenResponse.orcid, tokenResponse.access_token);
			userData.orcid = tokenResponse.orcid;
			userData.name = userData.name || tokenResponse.name || '';

			// Se não tem firstName/lastName separados, tenta dividir o name
			if (!userData.firstName && userData.name) {
				const nameParts = userData.name.split(' ');
				userData.firstName = nameParts[0];
				userData.lastName = nameParts.slice(1).join(' ') || '';
			}

			console.log('[ORCID Callback] ✓ User data fetched:', { 
				orcid: userData.orcid, 
				email: userData.email || 'NO EMAIL',
				firstName: userData.firstName,
				lastName: userData.lastName
			});
		} catch (err) {
			console.error('[ORCID Callback] Failed to fetch user data:', err instanceof Error ? err.message : err);
			return redirect(302, '/login?error=fetch_user_data_failed');
		}

		// PASSO 3: Verifica se usuário já existe
		// Busca por ORCID primeiro
		console.log('[ORCID Callback] PASSO 3: Checking if user exists...');
		let existingUser = await Users.findOne({ orcid: userData.orcid });

		if (existingUser) {
			// Usuário já existe e já foi conectado ao ORCID antes
			console.log('[ORCID Callback] ✓ User already exists with this ORCID. Logging in...', { userId: existingUser._id });
			
			// Atualiza tokens ORCID (no caso de refresh)
			existingUser.orcidAccessToken = tokenResponse.access_token;
			if (tokenResponse.refresh_token) {
				existingUser.orcidRefreshToken = tokenResponse.refresh_token;
			}
			existingUser.updatedAt = new Date().toISOString();
			
			try {
				await existingUser.save();
				console.log('[ORCID Callback] ✓ Tokens updated for existing user');
			} catch (err) {
				console.error('[ORCID Callback] ✗ Failed to update tokens:', err);
				throw err;
			}

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

			console.log('[ORCID Callback] ✓ Session cookie set. Redirecting to:', returnTo);
			return new Response(null, {
				status: 302,
				headers
			});
		}

		// Se não existe por ORCID, busca por email (para associação)
		if (userData.email) {
			existingUser = await Users.findOne({ email: userData.email });
			if (existingUser) {
				console.log('[ORCID Callback] Found user by email:', existingUser._id);
			}
		}

		// PASSO 4: Lógica de criar novo usuário ou associar ORCID
		if (!existingUser) {
			// Não existe usuário com esse ORCID nem com esse email
			// Cria novo usuário
			console.log('[ORCID Callback] PASSO 4: Creating new user with ORCID...');

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

			console.log('[ORCID Callback] Generated username:', username);

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

			console.log('[ORCID Callback] New user data prepared:', { 
				userId, 
				username, 
				email: newUserData.email, 
				orcid: userData.orcid,
				firstName: userData.firstName,
				lastName: userData.lastName
			});

			existingUser = new Users(newUserData);
			
			try {
				const savedUser = await existingUser.save();
				console.log(`[ORCID Callback] ✓ New user successfully saved:`);
				console.log(`  - User ID: ${userId}`);
				console.log(`  - Username: ${username}`);
				console.log(`  - Email: ${newUserData.email}`);
				console.log(`  - ORCID: ${userData.orcid}`);
				console.log(`  - Saved Document ID: ${savedUser._id}`);
			} catch (saveError) {
				console.error('[ORCID Callback] ✗ Failed to save new user');
				console.error('  Error:', saveError);
				if (saveError instanceof Error) {
					console.error('  Message:', saveError.message);
					console.error('  Stack:', saveError.stack);
				}
				throw saveError;
			}
		} else {
			// Usuário existe com esse email, associa ORCID
			console.log(`[ORCID Callback] PASSO 4: User exists with email ${userData.email}. Associating ORCID...`);

			existingUser.orcid = userData.orcid;
			existingUser.orcidAccessToken = tokenResponse.access_token;
			if (tokenResponse.refresh_token) {
				existingUser.orcidRefreshToken = tokenResponse.refresh_token;
			}
			existingUser.emailVerified = true; // Marca como verificado via ORCID
			existingUser.updatedAt = new Date().toISOString();
			
			try {
				await existingUser.save();
				console.log(`[ORCID Callback] ✓ ORCID ${userData.orcid} associated with existing user ${existingUser._id}`);
			} catch (err) {
				console.error('[ORCID Callback] ✗ Failed to associate ORCID:', err);
				throw err;
			}
		}

		// PASSO 5: Login usando o mesmo cookie do fluxo atual e redireciona para app.
		console.log('[ORCID Callback] PASSO 5: Creating session and logging in...');
		
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

		console.log('[ORCID Callback] Session user:', { 
			id: sessionUser.id,
			email: sessionUser.email,
			username: sessionUser.username,
			orcid: sessionUser.orcid
		});

		const headers = new Headers();
		headers.set('location', returnTo || '/');
		headers.append('set-cookie', buildSessionCookie(sessionUser));
		headers.append('set-cookie', 'orcid_oauth_state=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
		headers.append('set-cookie', 'orcid_oauth_return_to=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

		console.log('[ORCID Callback] ✓✓✓ SUCCESS! Redirecting to:', returnTo || '/');
		return new Response(null, {
			status: 302,
			headers
		});
	} catch (error) {
		console.error('[ORCID Callback] === FINAL ERROR ===');
		console.error('Error:', error);
		if (error instanceof Error) {
			console.error('Message:', error.message);
			console.error('Stack:', error.stack);
		}
		
		// Tenta retornar erro detalhado em modo de desenvolvimento
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[ORCID Callback] Redirecting to error page with message:', errorMessage);
		return redirect(302, `/login?error=orcid_callback_error&details=${encodeURIComponent(errorMessage)}`);
	}
};
