import { env } from '$env/dynamic/private';

export type OrcidConfig = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
};

function isPlaceholder(value?: string): boolean {
	if (!value) return true;
	// Trim whitespace and check for placeholders
	const trimmed = value.trim();
	return trimmed.includes('YOUR_') || trimmed.includes('your-');
}

/**
 * Trim whitespace from environment variables
 * Prevents issues like "ORCID_REDIRECT_URI= https://..." (with leading space)
 */
function safeEnv(value?: string): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	return trimmed;
}

/**
 * Resolve configuração ORCID com retrocompatibilidade para variáveis antigas.
 * Prioridade:
 * 1) ORCID_CLIENT_ID/ORCID_CLIENT_SECRET/ORCID_REDIRECT_URI
 * 2) NODE_ENV=production -> ORCID_PROD_*
 * 3) NODE_ENV=development -> ORCID_SANDBOX_*
 * 4) fallback para ORCID_PROD_* se sandbox estiver placeholder
 */
export function getOrcidConfig(): OrcidConfig | null {
	console.log('[OrcidConfig] Loading configuration...');
	
	// Trim all environment variables to handle leading/trailing spaces
	const ORCID_CLIENT_ID = safeEnv(env.ORCID_CLIENT_ID);
	const ORCID_CLIENT_SECRET = safeEnv(env.ORCID_CLIENT_SECRET);
	const ORCID_REDIRECT_URI = safeEnv(env.ORCID_REDIRECT_URI);
	const ORCID_PROD_CLIENT_ID = safeEnv(env.ORCID_PROD_CLIENT_ID);
	const ORCID_PROD_CLIENT_SECRET = safeEnv(env.ORCID_PROD_CLIENT_SECRET);
	const ORCID_PROD_REDIRECT_URI = safeEnv(env.ORCID_PROD_REDIRECT_URI);
	const ORCID_SANDBOX_CLIENT_ID = safeEnv(env.ORCID_SANDBOX_CLIENT_ID);
	const ORCID_SANDBOX_CLIENT_SECRET = safeEnv(env.ORCID_SANDBOX_CLIENT_SECRET);
	const ORCID_SANDBOX_REDIRECT_URI = safeEnv(env.ORCID_SANDBOX_REDIRECT_URI);
	const NODE_ENV = safeEnv(env.NODE_ENV);

	console.log('[OrcidConfig] NODE_ENV:', NODE_ENV);
	console.log('[OrcidConfig] Available variables:');
	console.log('  ORCID_CLIENT_ID:', ORCID_CLIENT_ID ? '***set***' : 'MISSING');
	console.log('  ORCID_PROD_CLIENT_ID:', ORCID_PROD_CLIENT_ID ? '***set***' : 'MISSING');
	console.log('  ORCID_SANDBOX_CLIENT_ID:', ORCID_SANDBOX_CLIENT_ID ? '***set***' : 'MISSING');

	const directConfigured =
		!isPlaceholder(ORCID_CLIENT_ID) &&
		!isPlaceholder(ORCID_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_REDIRECT_URI);

	if (directConfigured) {
		console.log('[OrcidConfig] Using direct ORCID_* variables');
		return {
			clientId: ORCID_CLIENT_ID,
			clientSecret: ORCID_CLIENT_SECRET,
			redirectUri: ORCID_REDIRECT_URI
		};
	}

	const envMode = (NODE_ENV || 'development').toLowerCase();
	const wantsProd = envMode === 'production';

	console.log('[OrcidConfig] Environment mode:', envMode, '- wants PROD:', wantsProd);

	const prodConfigured =
		!isPlaceholder(ORCID_PROD_CLIENT_ID) &&
		!isPlaceholder(ORCID_PROD_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_PROD_REDIRECT_URI);

	const sandboxConfigured =
		!isPlaceholder(ORCID_SANDBOX_CLIENT_ID) &&
		!isPlaceholder(ORCID_SANDBOX_CLIENT_SECRET) &&
		!isPlaceholder(ORCID_SANDBOX_REDIRECT_URI);

	console.log('[OrcidConfig] Prod configured:', prodConfigured, '| Sandbox configured:', sandboxConfigured);

	if (wantsProd && prodConfigured) {
		console.log('[OrcidConfig] ✓ Using ORCID_PROD_* configuration');
		return {
			clientId: ORCID_PROD_CLIENT_ID,
			clientSecret: ORCID_PROD_CLIENT_SECRET,
			redirectUri: ORCID_PROD_REDIRECT_URI
		};
	}

	if (!wantsProd && sandboxConfigured) {
		console.log('[OrcidConfig] ✓ Using ORCID_SANDBOX_* configuration');
		return {
			clientId: ORCID_SANDBOX_CLIENT_ID,
			clientSecret: ORCID_SANDBOX_CLIENT_SECRET,
			redirectUri: ORCID_SANDBOX_REDIRECT_URI
		};
	}

	if (prodConfigured) {
		console.log('[OrcidConfig] ✓ Fallback: Using ORCID_PROD_* configuration (prod configured but not primary mode)');
		return {
			clientId: ORCID_PROD_CLIENT_ID,
			clientSecret: ORCID_PROD_CLIENT_SECRET,
			redirectUri: ORCID_PROD_REDIRECT_URI
		};
	}

	console.error('[OrcidConfig] ✗ NO ORCID CONFIGURATION FOUND');
	console.error('[OrcidConfig] Checked:');
	console.error('  - Direct ORCID_CLIENT_ID: Not found');
	console.error('  - ORCID_PROD_*: Not configured');
	console.error('  - ORCID_SANDBOX_*: Not configured');

	return null;
}
