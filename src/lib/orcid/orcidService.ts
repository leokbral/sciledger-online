import { getOrcidConfig } from '$lib/orcid/config';

/**
 * Interface para resposta do ORCID ao trocar authorization_code por access_token
 */
interface OrcidTokenResponse {
	access_token: string;
	token_type: string;
	refresh_token?: string;
	expires_in: number;
	scope: string;
	orcid: string;
	name: string;
}

/**
 * Interface para dados do usuário retornados pelo ORCID
 */
export interface OrcidUserData {
	orcid: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	name?: string;
}

type OrcidPersonResponse = {
	name?: {
		'given-names'?: { value?: string };
		'family-name'?: { value?: string };
	};
};

type OrcidEmailsResponse = {
	email?: Array<{ email?: string; primary?: boolean; verified?: boolean }>;
};

const ORCID_OAUTH_BASE = 'https://orcid.org';
const ORCID_API_BASE = 'https://pub.orcid.org/v3.0';

/**
 * Troca o authorization_code por access_token com ORCID
 * 
 * @param authorizationCode - O código recebido do ORCID após autorização
 * @returns Token de acesso e dados básicos do usuário
 * @throws Error se a troca falhar
 */
export async function exchangeOrcidCode(authorizationCode: string): Promise<OrcidTokenResponse> {
	try {
		const orcidConfig = getOrcidConfig();
		if (!orcidConfig) {
			throw new Error('ORCID configuration is missing');
		}

		// Corpo da requisição para trocar o code por token
		const tokenParams = new URLSearchParams({
			client_id: orcidConfig.clientId,
			client_secret: orcidConfig.clientSecret,
			code: authorizationCode,
			grant_type: 'authorization_code',
			redirect_uri: orcidConfig.redirectUri
		});

		// Faz a requisição POST ao ORCID
		const response = await fetch(`${ORCID_OAUTH_BASE}/oauth/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: tokenParams.toString()
		});

		// Verifica se a requisição foi bem-sucedida
		if (!response.ok) {
			const errorData = await response.text();
			console.error('ORCID token exchange failed:', errorData);
			throw new Error(`Failed to exchange authorization code: ${response.statusText}`);
		}

		// Extrai e retorna o token
		const tokenData = (await response.json()) as OrcidTokenResponse;
		return tokenData;
	} catch (error) {
		console.error('Error exchanging ORCID code:', error);
		throw error;
	}
}

/**
 * Busca os dados do usuário do ORCID usando o access_token
 * 
 * @param orcidId - O ORCID iD do usuário (ex: 0000-0001-2345-6789)
 * @param accessToken - Token de acesso do ORCID
 * @returns Dados do usuário (email, firstName, lastName)
 * @throws Error se a busca falhar
 */
export async function fetchOrcidUserData(orcidId: string, accessToken: string): Promise<OrcidUserData> {
	try {
		// Busca dados pessoais
		const personResponse = await fetch(`${ORCID_API_BASE}/${orcidId}/person`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/json'
			}
		});

		if (!personResponse.ok) {
			console.error('Failed to fetch ORCID person data:', personResponse.statusText);
			throw new Error('Failed to fetch user data from ORCID');
		}

		const personData = (await personResponse.json()) as OrcidPersonResponse;

		// Busca email em endpoint específico (pode retornar vazio dependendo de permissões/privacidade)
		const emailResponse = await fetch(`${ORCID_API_BASE}/${orcidId}/email`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/json'
			}
		});

		let email: string | undefined;
		if (emailResponse.ok) {
			const emailData = (await emailResponse.json()) as OrcidEmailsResponse;
			if (Array.isArray(emailData.email) && emailData.email.length > 0) {
				const primary = emailData.email.find((e) => e.primary && e.verified);
				email = primary?.email || emailData.email[0]?.email;
			}
		}

		const firstName = personData.name?.['given-names']?.value || '';
		const lastName = personData.name?.['family-name']?.value || '';

		return {
			orcid: orcidId,
			email,
			firstName,
			lastName,
			name: `${firstName} ${lastName}`.trim()
		};
	} catch (error) {
		console.error('Error fetching ORCID user data:', error);
		throw error;
	}
}
