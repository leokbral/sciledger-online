import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { start_mongo } from '$lib/db/mongooseConnection';
import Papers from '$lib/db/models/Paper';

export const PATCH: RequestHandler = async ({ request, params }) => {
    await start_mongo();

    try {
        const { status } = await request.json();
        const paperId = params.id;

        if (!status) {
            return json({ error: 'Status is required.' }, { status: 400 });
        }

        const updatedPaper = await Papers.findOneAndUpdate(
            { id: paperId },
            {
                status: status,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        ).lean().exec();

        if (!updatedPaper) {
            return json({ error: 'Paper not found.' }, { status: 404 });
        }

        return json({ success: true, paper: updatedPaper }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating paper status:', error);
        return json({ error: 'Internal server error.' }, { status: 500 });
    }
};