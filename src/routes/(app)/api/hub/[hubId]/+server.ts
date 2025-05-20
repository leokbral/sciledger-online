import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { start_mongo } from '$lib/db/mongooseConnection';
import Hubs from '$lib/db/models/Hub';

export const GET: RequestHandler = async ({ params }) => {
    await start_mongo();
    const { hubId } = params;
    console.log('Received hubId:', hubId);
    try {
        const hub = await Hubs.findById(hubId)
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

export async function POST({ params, request }) {
    try {
        const { hubId } = params;
        const { reviewerId } = await request.json();

        const hub = await Hubs.findById(hubId);
        if (!hub) {
            return json({ error: 'Hub not found' }, { status: 404 });
        }

        // Check if reviewer is already in the array
        if (!Array.isArray(hub.reviewers)) {
            hub.reviewers = [];
        }
        if (!hub.reviewers.includes(reviewerId)) {
            hub.reviewers.push(reviewerId);
            await hub.save();
        }

        return json({ 
            success: true, 
            message: 'Reviewer added successfully',
            reviewers: hub.reviewers 
        });

    } catch (error) {
        console.error('Error adding reviewer to hub:', error);
        return json({ 
            error: 'Failed to add reviewer to hub',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}