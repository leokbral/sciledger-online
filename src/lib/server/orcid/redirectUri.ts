import { env } from '$env/dynamic/private';

const DEV_ORCID_CALLBACK_BASE = 'https://dev.sciledger.imd.ufrn.br';

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, '');
}

export function getOrcidRedirectUri(requestOrigin?: string) {
	const configured = env.ORCID_REDIRECT_URI?.trim();
	if (configured) {
		if (
			process.env.NODE_ENV !== 'production' &&
			configured.includes('scideep.imd.ufrn.br')
		) {
			return `${DEV_ORCID_CALLBACK_BASE}/orcid/callback`;
		}
		return configured;
	}

	const siteUrl = env.SITE_URL || env.PUBLIC_SITE_URL || requestOrigin || 'http://localhost:5173';
	return `${trimTrailingSlash(siteUrl)}/orcid/callback`;
}
