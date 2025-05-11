import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';

export const GET: RequestHandler = async ({ params }) => {
    await start_mongo();
    
    try {
        const hub = await Hubs.findById(params.id)
            .populate('createdBy', 'name email')
            .lean();

        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        return json({ hub });
    } catch (error) {
        console.error('Error fetching hub:', error);
        return json({ 
            error: 'Failed to fetch hub details',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};