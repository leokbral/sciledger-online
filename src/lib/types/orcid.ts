/**
 * Tipos TypeScript para integração ORCID OAuth 2.0
 */

/**
 * Resposta do endpoint de token do ORCID
 */
export interface OrcidTokenResponse {
	access_token: string;
	token_type: string;
	refresh_token?: string;
	expires_in: number;
	scope: string;
	orcid: string; // ORCID iD (ex: 0000-0002-1825-0097)
	name?: string; // Nome completo do usuário
}

/**
 * Estrutura de nome no perfil ORCID
 */
export interface OrcidName {
	'given-names'?: {
		value: string;
	};
	'family-name'?: {
		value: string;
	};
	'credit-name'?: {
		value: string;
	};
}

/**
 * Estrutura de email no perfil ORCID
 */
export interface OrcidEmail {
	email: string;
	primary?: boolean;
	verified?: boolean;
	visibility?: string;
}

/**
 * Resposta da API de pessoa do ORCID
 */
export interface OrcidPersonResponse {
	name?: OrcidName;
	emails?: {
		email: OrcidEmail[];
	};
	biography?: {
		content?: string;
	};
	'researcher-urls'?: {
		'researcher-url': Array<{
			'url-name': string;
			url: {
				value: string;
			};
		}>;
	};
}

/**
 * Dados do usuário extraídos do ORCID
 */
export interface OrcidUserData {
	orcid: string;
	firstName: string;
	lastName: string;
	email?: string;
	accessToken: string;
	refreshToken?: string;
	tokenExpiry: Date;
}
