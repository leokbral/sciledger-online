// src/lib/orcid/token.ts
export async function getOrcidToken() {
    const res = await fetch('https://orcid.org/oauth/token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: 'APP-6M2AKUYLCFMIFVQP',
            client_secret: '22c13c95-ebb4-4ac4-b084-09d5cd1e3cac',
            grant_type: 'client_credentials',
            scope: '/read-public'
        })
    });

    const data = await res.json();
    return data.access_token;
}
