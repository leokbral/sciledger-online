import {
	NODE_ENV,
	ORCID_CLIENT_ID,
	ORCID_CLIENT_SECRET,
	ORCID_ENV,
	ORCID_PROD_CLIENT_ID,
	ORCID_PROD_CLIENT_SECRET,
	ORCID_PROD_REDIRECT_URI,
	ORCID_REDIRECT_URI,
	ORCID_SANDBOX_CLIENT_ID,
	ORCID_SANDBOX_CLIENT_SECRET,
	ORCID_SANDBOX_REDIRECT_URI
} from '$env/static/private';

export type OrcidConfig = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
};

function isPlaceholder(value?: string): boolean {
	if (!value) return true;
	return value.includes('YOUR_') || value.includes('your-');
}

/**
 * Resolve configuração ORCID com retrocompatibilidade para variáveis antigas.
 * Prioridade:
 * 1) ORCID_CLIENT_ID/ORCID_CLIENT_SECRET/ORCID_REDIRECT_URI
 * 2) ORCID_ENV=production -> ORCID_PROD_*
 * 3) ORCID_ENV=development -> ORCID_SANDBOX_*
 * 4) fallback para ORCID_PROD_* se sandbox estiver placeholder
 */
export function getOrcidConfig(): OrcidConfig | null {
	const directConfigured =
		!isPlaceholder(ORCID_CLIENT_ID) &&
		!isPlaceholder(ORCID_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_REDIRECT_URI);

	if (directConfigured) {
		return {
			clientId: ORCID_CLIENT_ID,
			clientSecret: ORCID_CLIENT_SECRET,
			redirectUri: ORCID_REDIRECT_URI
		};
	}

	const env = (ORCID_ENV || NODE_ENV || 'development').toLowerCase();
	const wantsProd = env === 'production';

	const prodConfigured =
		!isPlaceholder(ORCID_PROD_CLIENT_ID) &&
		!isPlaceholder(ORCID_PROD_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_PROD_REDIRECT_URI);

	const sandboxConfigured =
		!isPlaceholder(ORCID_SANDBOX_CLIENT_ID) &&
		!isPlaceholder(ORCID_SANDBOX_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_SANDBOX_REDIRECT_URI);

	if (wantsProd && prodConfigured) {
		return {
			clientId: ORCID_PROD_CLIENT_ID,
			clientSecret: ORCID_PROD_CLIENT_SECRET,
			redirectUri: ORCID_PROD_REDIRECT_URI
		};
	}

	if (!wantsProd && sandboxConfigured) {
		return {
			clientId: ORCID_SANDBOX_CLIENT_ID,
			clientSecret: ORCID_SANDBOX_CLIENT_SECRET,
			redirectUri: ORCID_SANDBOX_REDIRECT_URI
		};
	}

	if (prodConfigured) {
		return {
			clientId: ORCID_PROD_CLIENT_ID,
			clientSecret: ORCID_PROD_CLIENT_SECRET,
			redirectUri: ORCID_PROD_REDIRECT_URI
		};
	}

	return null;
}
