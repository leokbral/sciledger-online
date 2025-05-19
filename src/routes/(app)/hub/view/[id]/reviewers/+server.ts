import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';

export const POST: RequestHandler = async ({ request, locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();
    const hubId = params.id;

    try {
        const hub = await Hubs.findById(hubId);
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Check if the current user is the hub creator
        if (hub.createdBy.toString() !== locals.user.id) {
            return json({ error: 'Only hub creators can manage reviewers' }, { status: 403 });
        }

        const { reviewers, action } = await request.json();

        switch (action) {
            case 'add':
                // Add new reviewers
                hub.reviewers = [...new Set([...(hub.reviewers || []), ...reviewers])];
                break;
            case 'remove':
                // Remove reviewers
                hub.reviewers = (hub.reviewers || []).filter(r => !reviewers.includes(r));
                break;
            default:
                return json({ error: 'Invalid action' }, { status: 400 });
        }

        await hub.save();
        return json({ success: true, reviewers: hub.reviewers });

    } catch (error) {
        console.error('Error managing reviewers:', error);
        return json({ error: 'Failed to manage reviewers' }, { status: 500 });
    }
}

export const GET: RequestHandler = async ({ locals, params }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await start_mongo();
    const hubId = params.id;

    try {
        const hub = await Hubs.findById(hubId).populate('reviewers', 'firstName lastName email');
        
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Only hub creators can see the full reviewer list
        if (hub.createdBy.toString() === locals.user.id) {
            return json({ reviewers: hub.reviewers });
        }

        return json({ error: 'Unauthorized to view reviewers' }, { status: 403 });

    } catch (error) {
        console.error('Error fetching reviewers:', error);
        return json({ error: 'Failed to fetch reviewers' }, { status: 500 });
    }
}