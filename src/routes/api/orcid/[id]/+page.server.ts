export async function load({ params }) {
    const orcidId = params.id;
    
    // Aqui você faria a chamada para a API do ORCID
    // ou buscaria os dados do seu banco de dados
    
    try {
        // Exemplo de busca de dados do ORCID
        const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/record`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('ORCID profile not found');
        }
        
        const profile = await response.json();
        
        return {
            profile
        };
    } catch (error) {
        throw error(404, 'ORCID profile not found');
    }
}