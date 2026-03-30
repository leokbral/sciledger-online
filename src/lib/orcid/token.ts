// src/lib/orcid/token.ts
import { ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_SANDBOX } from '$env/static/private';

export async function getOrcidToken() {
    if (!ORCID_CLIENT_ID || !ORCID_CLIENT_SECRET) {
        throw new Error('Missing ORCID credentials');
    }

    const tokenUrl = ORCID_SANDBOX === 'true'
        ? 'https://sandbox.orcid.org/oauth/token'
        : 'https://orcid.org/oauth/token';

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: ORCID_CLIENT_ID,
            client_secret: ORCID_CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: '/read-public'
        })
    });

    if (!res.ok) {
        throw new Error(`Failed to get ORCID token: ${res.status}`);
    }

    const data = await res.json();
    return data.access_token;
}
