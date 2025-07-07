// src/lib/orcid/profile.ts
import { getOrcidToken } from './token';

export async function fetchOrcidProfile(orcidId: string) {
    const token = await getOrcidToken();

    const res = await fetch(`https://pub.orcid.org/v3.0/${orcidId}`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
        }
    });

    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return await res.json();
}
