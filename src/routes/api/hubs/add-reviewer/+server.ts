import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';

export const POST: RequestHandler = async ({ request }) => {
    try {
        await start_mongo();
        
        const { hubId, userId } = await request.json();

        if (!hubId || !userId) {
            return json({ error: 'hubId and userId are required' }, { status: 400 });
        }

        const hub = await Hubs.findById(hubId);
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Check if reviewer is already in the array
        if (!Array.isArray(hub.reviewers)) {
            hub.reviewers = [];
        }
        
        if (!hub.reviewers.includes(userId)) {
            hub.reviewers.push(userId);
            await hub.save();
        }

        return json({ 
            success: true, 
            message: 'Reviewer added to hub successfully',
            reviewers: hub.reviewers 
        });

    } catch (error) {
        console.error('Error adding reviewer to hub:', error);
        return json({ 
            error: 'Failed to add reviewer to hub',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
};
