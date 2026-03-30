import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function load({ params }) {
    const orcidId = params.id;
    
    // Aqui você faria a chamada para a API do ORCID
    // ou buscaria os dados do seu banco de dados
    
    try {
        // Exemplo de busca de dados do ORCID
        const apiBase = env.ORCID_SANDBOX === 'true' ? 'https://pub.sandbox.orcid.org/v3.0' : 'https://pub.orcid.org/v3.0';
        const response = await fetch(`${apiBase}/${orcidId}/record`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw error(404, 'ORCID profile not found');
        }
        
        const profile = await response.json();
        
        return {
            profile
        };
    } catch (err) {
        throw error(404, 'ORCID profile not found');
    }
}