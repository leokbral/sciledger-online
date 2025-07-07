// src/routes/api/orcid/[id]/+server.ts
import { fetchOrcidProfile } from '$lib/orcid/profile';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const data = await fetchOrcidProfile(params.id);
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
