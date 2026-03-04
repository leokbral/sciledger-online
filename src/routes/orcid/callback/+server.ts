import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_REDIRECT_URI } from '$env/static/private';
import { start_mongo } from '$lib/db/mongooseConnection';
import Users from '$lib/db/models/User';
import { respond } from '../../(auth)/_respond';
import * as crypto from 'crypto';

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
export const GET: RequestHandler = async ({ url }) => {
	console.log('🟢 ORCID Callback - Started');
	console.log('Full URL:', url.href);
	
	try {
		await start_mongo();
		console.log('✅ MongoDB connected');

		// Extrai o authorization_code da URL
		const code = url.searchParams.get('code');
		const error = url.searchParams.get('error');
		
		console.log('Code:', code ? code.substring(0, 10) + '...' : 'null');
		console.log('Error:', error);

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
		if (!ORCID_CLIENT_ID || !ORCID_CLIENT_SECRET || !ORCID_REDIRECT_URI) {
			console.error('❌ ORCID credentials not configured');
			throw new Error('ORCID credentials not configured');
		}
		
		console.log('✅ All validations passed, exchanging code for token...');

		// ====================================================================
		// ETAPA 1: Trocar authorization_code por access_token
		// ====================================================================
		
		const ORCID_TOKEN_URL = 'https://orcid.org/oauth/token';
		
		const tokenParams = new URLSearchParams({
			client_id: ORCID_CLIENT_ID,
			client_secret: ORCID_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: ORCID_REDIRECT_URI
		});

		const tokenResponse = await fetch(ORCID_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: tokenParams.toString()
		});

		console.log('Token response status:', tokenResponse.status);

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error('❌ Failed to exchange code for token:', errorData);
			throw redirect(302, '/login?error=token_exchange_failed');
		}

		const tokenData = await tokenResponse.json();
		console.log('✅ Token obtained successfully');
		console.log('ORCID iD:', tokenData.orcid);
		
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
		
		// Busca dados públicos do perfil ORCID - PRODUÇÃO
		const ORCID_API_URL = `https://pub.orcid.org/v3.0/${orcid}/person`;
		
		console.log('📡 Fetching ORCID profile:', ORCID_API_URL);
		
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
			console.log('✅ ORCID profile fetched');
			
			// Extrai nome
			if (personData.name) {
				firstName = personData.name['given-names']?.value || '';
				lastName = personData.name['family-name']?.value || '';
				console.log('Name from ORCID API:', firstName, lastName);
			}

			// Extrai email (se disponível e público)
			if (personData.emails?.email && personData.emails.email.length > 0) {
				console.log('Emails found:', personData.emails.email.length);
				// Busca o email primário ou o primeiro disponível
				const primaryEmail = personData.emails.email.find((e: any) => e.primary === true);
				email = primaryEmail?.email || personData.emails.email[0]?.email || '';
				console.log('Email extracted:', email);
			} else {
				console.log('⚠️ No emails found in ORCID profile (may be private)');
			}
			}
		}

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
		console.log('User found by ORCID:', user ? user.email : 'not found');

		if (user) {
			// Usuário já existe com este ORCID - Fazer login
			console.log('✅ User found by ORCID, logging in');

			// Atualiza tokens ORCID
			user.orcidAccessToken = access_token;
			user.orcidRefreshToken = refresh_token || user.orcidRefreshToken;
			user.orcidTokenExpiry = new Date(Date.now() + expires_in * 1000);
			await user.save();
			
			console.log('✅ Tokens updated, logging in and redirecting');

			// Faz login usando sistema atual (define cookie) e redireciona
			const response = respond({ user });
			response.headers.set('Location', '/');
			
			return new Response(null, {
				status: 302,
				headers: response.headers
			});
		}

		// 3.2: Se tem email, buscar por email
		if (email) {
			user = await Users.findOne({ email: email });
			console.log('User found by email:', user ? user.username : 'not found');

			if (user) {
				// Usuário já existe com este email - Associar ORCID
				console.log('✅ User found by email, associating ORCID');

				// Associa ORCID ao usuário existente
				user.orcid = orcid;
				user.orcidAccessToken = access_token;
				user.orcidRefreshToken = refresh_token;
				user.orcidTokenExpiry = new Date(Date.now() + expires_in * 1000);
				user.emailVerified = true; // ORCID já verificou o email
				await user.save();
				
				console.log('✅ ORCID associated, logging in and redirecting');

				// Faz login usando sistema atual (define cookie) e redireciona
				const response = respond({ user });
				response.headers.set('Location', '/');
				
				return new Response(null, {
					status: 302,
					headers: response.headers
				});
			}
		}

		// ====================================================================
		// ETAPA 4: Criar novo usuário
		// ====================================================================

		console.log('🆕 Creating new user from ORCID');

		// Se não tem email do ORCID, usa email placeholder (usuário pode atualizar depois)
		const userEmail = email || `${orcid}@orcid.placeholder`;

		console.log('Email:', userEmail);
		console.log('Name:', firstName, lastName);

		// Gera username único baseado no ORCID
		const baseUsername = `@${firstName.toLowerCase()}_${orcid.split('-').pop()}`;
		let username = baseUsername;
		let usernameExists = await Users.findOne({ username });
		let counter = 1;

		// Garante que username é único
		while (usernameExists) {
			username = `${baseUsername}_${counter}`;
			usernameExists = await Users.findOne({ username });
			counter++;
		}

		// Cria senha aleatória (usuário pode definir uma depois se quiser)
		// Usuário poderá usar "Esqueci minha senha" para definir uma senha
		const randomPassword = crypto.randomBytes(32).toString('hex');

		const userId = crypto.randomUUID();

		// Cria novo usuário
		const newUser = new Users({
			_id: userId,
			id: userId,
			firstName,
			lastName,
			email: userEmail,
			username,
			country: '', // Usuário pode preencher depois
			dob: '', // Usuário pode preencher depois
			password: randomPassword, // Senha temporária aleatória
			emailVerified: email ? true : false, // Se tem email do ORCID, considera verificado
			orcid: orcid,
			orcidAccessToken: access_token,
			orcidRefreshToken: refresh_token,
			orcidTokenExpiry: new Date(Date.now() + expires_in * 1000),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		});

		await newUser.save();

		console.log('✅ New user created successfully:', newUser.id);
		console.log('✅ User logged in via respond, redirecting to home');

		// Faz login usando sistema atual (define cookie)
		const response = respond({ user: newUser });
		
		// Adiciona header de redirect
		response.headers.set('Location', '/');
		
		return new Response(null, {
			status: 302,
			headers: response.headers
		});

	} catch (error) {
		console.error('❌ ORCID callback error:', error);
		
		// Se for um redirect, propaga
		if (error instanceof Response) {
			throw error;
		}
		
		// Senão, redireciona para login com erro
		console.error('❌ Redirecting to login with error');
		throw redirect(302, '/login?error=orcid_callback_failed');
	}
};
