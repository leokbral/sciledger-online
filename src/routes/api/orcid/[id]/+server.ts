// src/routes/api/orcid/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ORCID_SANDBOX } from '$env/static/private';

export const GET: RequestHandler = async ({ params, fetch }) => {
    const orcidId = params.id;

    if (!orcidId) {
        return json({ error: 'ORCID ID is required' }, { status: 400 });
    }

    // Validate ORCID format
    const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
    if (!orcidRegex.test(orcidId)) {
        return json({ error: 'Invalid ORCID format' }, { status: 400 });
    }

    try {
        // ORCID Public API endpoint
        const apiBase = ORCID_SANDBOX === 'true' ? 'https://pub.sandbox.orcid.org/v3.0' : 'https://pub.orcid.org/v3.0';
        const orcidApiUrl = `${apiBase}/${orcidId}`;
        
        const response = await fetch(orcidApiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'SciLedger-App/1.0'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return json({ error: 'ORCID profile not found' }, { status: 404 });
            }
            throw new Error(`ORCID API error: ${response.status}`);
        }

        const profile = await response.json();

        return json({ 
            profile,
            success: true 
        });

    } catch (error) {
        console.error('Error fetching ORCID profile:', error);
        return json({ 
            error: 'Failed to fetch ORCID profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
